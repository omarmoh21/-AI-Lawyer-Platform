"""Article lookup endpoint — fetch a specific law article verbatim (no LLM).

Backed by the BM25-filtered exact search in app.services.rag.qdrant_search.
Each lookup (hit or miss) is logged per-user so it can be revisited later.
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import SearchHistory, User
from app.services.rag.qdrant_search import article_search

router = APIRouter(tags=["articles"])
logger = logging.getLogger(__name__)


class ArticleOut(BaseModel):
    law_name: str
    article_name: str | None
    article_number: int
    text: str
    history_id: int


class SearchHistoryOut(BaseModel):
    id: int
    law_name: str
    article_number: int
    article_name: str | None
    text: str | None
    found: bool
    created_at: datetime

    model_config = {"from_attributes": True}


@router.get("/articles", response_model=ArticleOut)
def get_article(
    law_name: str = Query(..., min_length=2, description="اسم القانون، مثال: قانون العقوبات"),
    article_number: int = Query(..., ge=1, description="رقم المادة"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = article_search(law_name, article_number)

    history_row = SearchHistory(
        user_id=current_user.id,
        law_name=law_name,
        article_number=article_number,
        article_name=result.get("article_name") if result else None,
        text=result.get("text") if result else None,
        found=result is not None,
    )
    db.add(history_row)
    db.commit()
    db.refresh(history_row)

    if result is None:
        raise HTTPException(
            404, f"لم يتم العثور على المادة {article_number} من {law_name} في قاعدة البيانات."
        )

    return ArticleOut(
        law_name=result.get("law_name"),
        article_name=result.get("article_name"),
        article_number=article_number,
        text=result.get("text"),
        history_id=history_row.id,
    )


@router.get("/articles/history", response_model=list[SearchHistoryOut])
def list_search_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(SearchHistory)
        .filter(SearchHistory.user_id == current_user.id)
        .order_by(SearchHistory.created_at.desc())
        .limit(50)
        .all()
    )
