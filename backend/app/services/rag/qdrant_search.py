import asyncio

from qdrant_client import models

from app.core.models import qdrant_client, bm25_model
from app.services.rag.tei_embedder import embed_query
from app.services.rag.reranker import rerank
from app.config.settings import (
    COLLECTION_NAME,
    ARTICLES_COLLECTION,
    TOP_K,
    RERANK_TOP_K,
    RERANK_CANDIDATES,
)


def _sparse_embed(text: str):
    """fastembed's sparse encoder is CPU-bound local computation (no async
    variant exists) — callers must run this via asyncio.to_thread."""
    return list(bm25_model.embed([text]))[0]


async def hybrid_search(query: str) -> list[dict]:
    """Hybrid dense + BM25 search with RRF fusion, then Cohere reranking.

    Fetches RERANK_CANDIDATES fused hits, reranks them for relevance, and
    returns the best RERANK_TOP_K. Reranking is best-effort: if disabled or
    unavailable it transparently falls back to the raw RRF ordering.
    """
    dense_vector, sparse_vector = await asyncio.gather(
        embed_query(query),
        asyncio.to_thread(_sparse_embed, query),
    )

    active_filter = models.Filter(
        must=[
            models.FieldCondition(key="cancelled", match=models.MatchValue(value=False))
        ]
    )

    results = (
        await qdrant_client.query_points(
            collection_name=COLLECTION_NAME,
            prefetch=[
                models.Prefetch(
                    query=dense_vector, using="dense", limit=TOP_K, filter=active_filter
                ),
                models.Prefetch(
                    query=models.SparseVector(
                        indices=sparse_vector.indices.tolist(),
                        values=sparse_vector.values.tolist(),
                    ),
                    using="bm25",
                    limit=TOP_K,
                    filter=active_filter,
                ),
            ],
            query=models.FusionQuery(fusion=models.Fusion.RRF),
            limit=RERANK_CANDIDATES,
        )
    ).points

    candidates = [
        {
            "law_name": r.payload.get("law_name"),
            "article_id": r.payload.get("article_id"),
            "category": r.payload.get("category"),
            "text": r.payload.get("text"),
            "score": round(float(r.score), 4),
        }
        for r in results
    ]

    # Best-effort rerank; falls back to RRF order (candidates[:RERANK_TOP_K]).
    return await rerank(query, candidates, top_k=RERANK_TOP_K)


async def article_search(law_name: str, article_number: int) -> dict | None:
    """Fetch a specific article by law name and article number."""
    sparse = await asyncio.to_thread(_sparse_embed, law_name)
    results = (
        await qdrant_client.query_points(
            collection_name=ARTICLES_COLLECTION,
            using="bm25",
            query=models.SparseVector(
                indices=sparse.indices.tolist(),
                values=sparse.values.tolist(),
            ),
            query_filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="article_number",
                        match=models.MatchValue(value=article_number),
                    )
                ]
            ),
            limit=3,
        )
    ).points

    return results[0].payload if results else None
