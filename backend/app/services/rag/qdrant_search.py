from qdrant_client import models

from app.core.models import qdrant_client, dense_model, bm25_model
from app.config.settings import COLLECTION_NAME, ARTICLES_COLLECTION, TOP_K, RERANK_TOP_K


def hybrid_search(query: str) -> list[dict]:
    """Hybrid dense + BM25 search with RRF fusion over the law collection."""
    dense_vector  = dense_model.encode(query, normalize_embeddings=True).tolist()
    sparse_vector = list(bm25_model.embed([query]))[0]

    active_filter = models.Filter(
        must=[models.FieldCondition(key="cancelled", match=models.MatchValue(value=False))]
    )

    results = qdrant_client.query_points(
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
        limit=RERANK_TOP_K,
    ).points

    return [
        {
            "law_name"  : r.payload.get("law_name"),
            "article_id": r.payload.get("article_id"),
            "category"  : r.payload.get("category"),
            "text"      : r.payload.get("text"),
            "score"     : round(float(r.score), 4),
        }
        for r in results
    ]


def article_search(law_name: str, article_number: int) -> dict | None:
    """Fetch a specific article by law name and article number."""
    sparse = list(bm25_model.embed([law_name]))[0]
    results = qdrant_client.query_points(
        collection_name=ARTICLES_COLLECTION,
        using="bm25",
        query=models.SparseVector(
            indices=sparse.indices.tolist(),
            values=sparse.values.tolist(),
        ),
        query_filter=models.Filter(
            must=[models.FieldCondition(
                key="article_number", match=models.MatchValue(value=article_number)
            )]
        ),
        limit=3,
    ).points

    return results[0].payload if results else None
