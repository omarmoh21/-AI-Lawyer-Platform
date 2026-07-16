"""Chat endpoint — exposes the supervisor agent (legal Q&A, contracts, follow-ups).

Conversations are kept in an in-memory session store keyed by session_id;
the client passes the session_id back on each turn to continue a conversation.
"""

import logging
import uuid

from fastapi import APIRouter
from pydantic import BaseModel

from app.agents import supervisor

router = APIRouter(tags=["chat"])
logger = logging.getLogger(__name__)

# In-memory conversation store: session_id -> LangChain message history.
_SESSIONS: dict[str, list] = {}
_MAX_SESSIONS = 500


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    # Already-extracted (and human-verified) document text to attach, if any.
    extracted_text: str = ""


class ChatResponse(BaseModel):
    session_id: str
    response: str
    docx_path: str | None = None


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    session_id = req.session_id or str(uuid.uuid4())
    history = _SESSIONS.setdefault(session_id, [])

    # Evict oldest sessions past the cap (dict preserves insertion order).
    if len(_SESSIONS) > _MAX_SESSIONS:
        for key in list(_SESSIONS)[: len(_SESSIONS) - _MAX_SESSIONS]:
            _SESSIONS.pop(key, None)

    response, history, docx_path = supervisor.run(
        req.message, history, extracted_text=req.extracted_text
    )
    _SESSIONS[session_id] = history

    logger.info("chat — session %s, %d turns", session_id, len(history) // 2)
    return ChatResponse(session_id=session_id, response=response, docx_path=docx_path)