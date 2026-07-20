import asyncio

from qdrant_client import models

from app.core.models import async_qdrant_client, dense_model, bm25_model
from app.config.settings import COLLECTION_NAME, ARTICLES_COLLECTION, TOP_K, RERANK_TOP_K


async def hybrid_search(query: str) -> list[dict]:
    """Hybrid dense + BM25 search with RRF fusion over the law collection."""
    # Embedding is CPU-bound with no async API — run it off the event loop
    # rather than blocking it while a (possibly GPU-bound) model runs.
    dense_vector  = await asyncio.to_thread(
        lambda: dense_model.encode(query, normalize_embeddings=True).tolist()
    )
    sparse_vector = await asyncio.to_thread(lambda: list(bm25_model.embed([query]))[0])

    active_filter = models.Filter(
        must=[models.FieldCondition(key="cancelled", match=models.MatchValue(value=False))]
    )

    response = await async_qdrant_client.query_points(
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
    )
    results = response.points

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


async def article_search(law_name: str, article_number: int) -> dict | None:
    """Fetch a specific article by law name and article number."""
    sparse = await asyncio.to_thread(lambda: list(bm25_model.embed([law_name]))[0])
    response = await async_qdrant_client.query_points(
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
    )
    results = response.points

    return results[0].payload if results else None
