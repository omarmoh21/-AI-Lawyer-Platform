"""Chat endpoint — exposes the supervisor agent (legal Q&A, contracts, follow-ups).

Conversations are persisted per-user in the database, keyed by session_id;
the client passes the session_id back on each turn to continue a conversation.
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agents import supervisor
from app.auth.dependencies import get_current_user
from app.db.database import get_db
from app.db.models import ChatMessage, ChatSession, User

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    # Already-extracted (and human-verified) document text to attach, if any.
    extracted_text: str = ""


class ChatResponse(BaseModel):
    session_id: str
    response: str
    docx_path: str | None = None


class SessionOut(BaseModel):
    id: str
    title: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MessageOut(BaseModel):
    role: str
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


def _get_or_create_session(
    db: Session, session_id: str | None, user_id: int
) -> ChatSession:
    if session_id is not None:
        session = db.get(ChatSession, session_id)
        if session is None or session.user_id != user_id:
            # Treat "not found" and "not owned" identically so guessing a
            # session_id never reveals whether it belongs to someone else.
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Chat session not found")
        return session

    session = ChatSession(id=str(uuid.uuid4()), user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _load_history(db: Session, session_id: str) -> list:
    rows = (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id.asc())
        .all()
    )
    history = []
    for row in rows:
        cls = HumanMessage if row.role == "user" else AIMessage
        history.append(cls(content=row.content))
    return history


def _persist_new_turn(db: Session, session: ChatSession, new_messages: list) -> None:
    for msg in new_messages:
        role = "user" if isinstance(msg, HumanMessage) else "assistant"
        db.add(ChatMessage(session_id=session.id, role=role, content=msg.content))

    if session.title is None:
        first_human = next(
            (m for m in new_messages if isinstance(m, HumanMessage)), None
        )
        if first_human:
            session.title = first_human.content[:80]

    session.updated_at = datetime.now(timezone.utc)
    db.commit()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    session = _get_or_create_session(db, req.session_id, current_user.id)
    history = _load_history(db, session.id)
    turn_start = len(history)

    response, history, docx_path = await supervisor.run(
        req.message, history, extracted_text=req.extracted_text
    )

    _persist_new_turn(db, session, history[turn_start:])

    logger.info(
        "chat — user %s, session %s, %d turns",
        current_user.id,
        session.id,
        len(history) // 2,
    )
    return ChatResponse(session_id=session.id, response=response, docx_path=docx_path)


@router.get("/chat/sessions", response_model=list[SessionOut])
def list_sessions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(ChatSession)
        .filter(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
        .all()
    )


@router.get("/chat/sessions/{session_id}/messages", response_model=list[MessageOut])
def get_session_messages(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.get(ChatSession, session_id)
    if session is None or session.user_id != current_user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chat session not found")

    return (
        db.query(ChatMessage)
        .filter(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.id.asc())
        .all()
    )


@router.delete("/chat/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    session = db.get(ChatSession, session_id)
    if session is None or session.user_id != current_user.id:
        # Same 404 for "not found" and "not owned" — don't leak existence.
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Chat session not found")

    # No DB-level cascade on chat_messages, so delete the messages first.
    db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
    db.delete(session)
    db.commit()
