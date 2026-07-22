"""Best-effort relevance reranking via Cohere Rerank.

Design goals:
  * Reranking is an *enhancement*, never a hard dependency. Any failure
    (disabled, missing key, 429 rate limit, quota exhausted, network error)
    transparently falls back to the caller's original ordering.
  * The Cohere trial key allows only ~10 requests/min. A process-wide throttle
    guarantees we never call faster than RERANK_MIN_INTERVAL_SEC apart; if a
    request would arrive sooner, we skip reranking for it (fallback) instead of
    blocking the user.
"""

import logging
import threading
import time

from app.config.settings import (
    COHERE_API_KEY,
    COHERE_RERANK_MODEL,
    RERANK_ENABLED,
    RERANK_MIN_INTERVAL_SEC,
)

logger = logging.getLogger(__name__)

_client = None  # lazily-created cohere.Client
_lock = threading.Lock()  # guards _last_call
_last_call = 0.0  # monotonic timestamp of the last Cohere call


def _get_client():
    """Create the Cohere async client once, or None if unavailable."""
    global _client
    if _client is None:
        if not COHERE_API_KEY:
            return None
        import cohere

        _client = cohere.AsyncClient(api_key=COHERE_API_KEY)
    return _client


def _acquire_slot() -> bool:
    """Return True if enough time has passed to make a call without risking a
    429. Non-blocking: if we're inside the min interval, return False so the
    caller falls back rather than waiting."""
    global _last_call
    with _lock:
        now = time.monotonic()
        if now - _last_call < RERANK_MIN_INTERVAL_SEC:
            return False
        _last_call = now
        return True


async def rerank(
    query: str, docs: list[dict], top_k: int, text_key: str = "text"
) -> list[dict]:
    """Reorder ``docs`` by relevance to ``query`` and return the top ``top_k``.

    Falls back to ``docs[:top_k]`` (original order) whenever reranking is
    disabled or unavailable for any reason.
    """
    fallback = docs[:top_k]

    if not RERANK_ENABLED or not docs:
        return fallback

    client = _get_client()
    if client is None:
        logger.warning("Rerank enabled but COHERE_API_KEY missing — using RRF order")
        return fallback

    if not _acquire_slot():
        logger.info(
            "Rerank throttled (<%.1fs since last call) — using RRF order",
            RERANK_MIN_INTERVAL_SEC,
        )
        return fallback

    try:
        texts = [d.get(text_key, "") for d in docs]
        resp = await client.rerank(
            model=COHERE_RERANK_MODEL,
            query=query,
            documents=texts,
            top_n=top_k,
        )
        reranked = []
        for r in resp.results:
            doc = dict(docs[r.index])  # preserve all original keys
            doc["score"] = round(float(r.relevance_score), 4)
            reranked.append(doc)
        logger.info(
            "Reranked %d candidates → top %d via %s",
            len(docs),
            len(reranked),
            COHERE_RERANK_MODEL,
        )
        return reranked
    except Exception as e:  # 429, quota, network, anything — never break search
        logger.warning(
            "Cohere rerank failed (%s) — falling back to RRF order", type(e).__name__
        )
        return fallback
