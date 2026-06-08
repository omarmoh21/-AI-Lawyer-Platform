from __future__ import annotations

from qdrant_client import QdrantClient

from app.config.settings import Settings
from .retriever import retrieve
from .generator import generate_answer


def answer(
    query: str,
    client: QdrantClient,
    settings: Settings,
) -> dict:
    """
    Main entry point consumed by the API endpoint.

    Parameters
    ----------
    query    : the user's legal question (Arabic)
    client   : the shared Qdrant singleton injected from main.py
    settings : app Settings instance

    Returns
    -------
    {
        "answer": str,          # Arabic answer from OpenAI
        "sources": list[dict],  # top docs with law_name, article_id, score
    }
    """
    top_docs = retrieve(query, client, settings)

    reply = generate_answer(query, top_docs, settings)

    sources = [
        {
            "law_name": d["law_name"],
            "article_id": d["article_id"],
            "score": d["score"],
        }
        for d in top_docs
    ]

    return {"answer": reply, "sources": sources}
