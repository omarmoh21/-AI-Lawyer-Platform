"""Article lookup endpoint — fetch a specific law article verbatim (no LLM).

Backed by the BM25-filtered exact search in app.services.rag.qdrant_search.
"""

import logging

from fastapi import APIRouter, HTTPException, Query

from app.services.rag.qdrant_search import article_search

router = APIRouter(tags=["articles"])
logger = logging.getLogger(__name__)


@router.get("/articles")
def get_article(
    law_name: str = Query(..., min_length=2, description="اسم القانون، مثال: قانون العقوبات"),
    article_number: int = Query(..., ge=1, description="رقم المادة"),
):
    result = article_search(law_name, article_number)
    if result is None:
        raise HTTPException(
            404, f"لم يتم العثور على المادة {article_number} من {law_name} في قاعدة البيانات."
        )
    return {
        "law_name": result.get("law_name"),
        "article_name": result.get("article_name"),
        "article_number": article_number,
        "text": result.get("text"),
    }
