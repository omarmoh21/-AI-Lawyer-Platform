"""Chat endpoint — exposes the supervisor agent (legal Q&A, contracts, follow-ups).

Conversations are persisted per-user in the database, keyed by session_id;
the client passes the session_id back on each turn to continue a conversation.
"""

import json
import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.agents import supervisor
from app.auth.dependencies import get_current_user
from app.core.limiter import limiter
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


def _get_or_create_session(db: Session, session_id: str | None, user_id: int) -> ChatSession:
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
        first_human = next((m for m in new_messages if isinstance(m, HumanMessage)), None)
        if first_human:
            session.title = first_human.content[:80]

    session.updated_at = datetime.now(timezone.utc)
    db.commit()


@router.post("/chat", response_model=ChatResponse)
@limiter.limit("15/minute")
async def chat(
    request: Request,
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ChatResponse:
    session = _get_or_create_session(db, req.session_id, current_user.id)
    history = _load_history(db, session.id)
    turn_start = len(history)

    response, docx_path = "", None
    async for event in supervisor.astream(
        req.message, history, extracted_text=req.extracted_text
    ):
        if event["type"] == "done":
            response = event["response"]
            docx_path = event.get("docx_path")

    _persist_new_turn(db, session, history[turn_start:])

    logger.info(
        "chat — user %s, session %s, %d turns", current_user.id, session.id, len(history) // 2
    )
    return ChatResponse(session_id=session.id, response=response, docx_path=docx_path)


@router.post("/chat/stream")
@limiter.limit("15/minute")
async def chat_stream(
    request: Request,
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> StreamingResponse:
    """Same turn as POST /chat, but streamed as Server-Sent Events so the
    client can render the answer as it arrives instead of waiting for the
    whole thing. Each event is a JSON object on one line:
      {"type": "session", "session_id": "..."}    sent once, immediately
      {"type": "chunk", "text": "..."}             zero or more live tokens
      {"type": "done", "response": "...", "docx_path": ...}   always last
      {"type": "error", "message": "..."}          only on failure
    """
    session = _get_or_create_session(db, req.session_id, current_user.id)
    history = _load_history(db, session.id)
    turn_start = len(history)

    async def event_source():
        yield f"data: {json.dumps({'type': 'session', 'session_id': session.id})}\n\n"
        try:
            async for event in supervisor.astream(
                req.message, history, extracted_text=req.extracted_text
            ):
                if event["type"] == "done":
                    _persist_new_turn(db, session, history[turn_start:])
                    logger.info(
                        "chat — user %s, session %s, %d turns",
                        current_user.id, session.id, len(history) // 2,
                    )
                yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error("chat stream failed: %s", e, exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"

    return StreamingResponse(event_source(), media_type="text/event-stream")


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

    db.delete(session)
    db.commit()
