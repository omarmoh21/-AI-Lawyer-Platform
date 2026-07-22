import httpx

from app.config.settings import TEI_EMBED_URL

_client = httpx.AsyncClient(timeout=60)


async def embed_query(text: str) -> list[float]:
    """Return the L2-normalized dense embedding for a single text.

    `normalize=True` mirrors the previous `encode(..., normalize_embeddings=True)`
    call so cosine scores stay consistent with the existing index.
    """
    resp = await _client.post(
        TEI_EMBED_URL,
        json={"inputs": text, "normalize": True},
    )
    resp.raise_for_status()
    return resp.json()[0]
