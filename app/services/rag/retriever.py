# app/services/rag/retriever.py

from __future__ import annotations

import torch
from functools import lru_cache

from qdrant_client import QdrantClient
from qdrant_client.models import SparseVector, FusionQuery, Fusion, Prefetch
from sentence_transformers import SentenceTransformer

from app.config.settings import Settings

# ── Vector field names (must match Qdrant collection schema) ───────
DENSE_FIELD = "dense"  # 768-dim Cosine — Arabic-Triplet-Matryoshka-V2
SPARSE_FIELD = "bm25"  # IDF-modified sparse — server-side

_device = "cuda" if torch.cuda.is_available() else "cpu"


# ── Lazy dense model singleton ─────────────────────────────────────


@lru_cache(maxsize=1)
def _get_dense_model(model_name: str) -> SentenceTransformer:
    return SentenceTransformer(model_name, device=_device)


# ── Embedding helpers ──────────────────────────────────────────────


def _embed_dense(query: str, settings: Settings) -> list[float]:
    """768-dim Cosine embedding via Arabic-Triplet-Matryoshka-V2."""
    model = _get_dense_model(settings.DENSE_MODEL)
    return model.encode(query, convert_to_numpy=True).tolist()


def _embed_sparse(query: str) -> SparseVector:
    """
    Lightweight token-based sparse vector.
    Qdrant applies IDF server-side — no local onnxruntime needed.
    """
    tokens = query.lower().split()
    indices = [abs(hash(t)) % 30000 for t in tokens]
    values = [1.0] * len(tokens)
    return SparseVector(indices=indices, values=values)


# ── Public retrieval function ──────────────────────────────────────


def retrieve(
    query: str,
    client: QdrantClient,
    settings: Settings,
) -> list[dict]:
    """
    Dense + BM25 → RRF fusion inside Qdrant.

    Returns top settings.TOP_K docs, each with:
        law_name, article_id, text, category, section,
        book, chapter, token_count, cancelled, is_commentary, score
    """
    dense_vec = _embed_dense(query, settings)
    sparse_vec = _embed_sparse(query)

    hits = client.query_points(
        collection_name=settings.COLLECTION_NAME,
        prefetch=[
            Prefetch(
                query=dense_vec,
                using=DENSE_FIELD,
                limit=settings.PREFETCH_K,
            ),
            Prefetch(
                query=sparse_vec,
                using=SPARSE_FIELD,
                limit=settings.PREFETCH_K,
            ),
        ],
        query=FusionQuery(fusion=Fusion.RRF),
        limit=settings.TOP_K,
        with_payload=True,
        query_filter={
            "must": [
                {"key": "cancelled", "match": {"value": False}},
                {"key": "is_commentary", "match": {"value": False}},
            ]
        },
    )

    return [
        {
            "law_name": h.payload.get("law_name"),
            "article_id": h.payload.get("article_id"),
            "text": h.payload.get("text"),
            "category": h.payload.get("category"),
            "section": h.payload.get("section"),
            "book": h.payload.get("book"),
            "chapter": h.payload.get("chapter"),
            "token_count": h.payload.get("token_count"),
            "cancelled": h.payload["cancelled"],
            "is_commentary": h.payload["is_commentary"],
            "score": h.score,
        }
        for h in hits.points
    ]
