"""Speech-to-text endpoint — wraps the ElevenLabs Scribe ASR service.

The frontend records the user's voice (MediaRecorder → webm/mp4 blob) and posts
it here; we save it to a temp file, transcribe it, and return the text so the
client can drop it into the chat input.
"""

import logging
import os
import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.db.models import User
from app.services.asr.elevenlabs_asr import transcribe

router = APIRouter(tags=["transcribe"])
logger = logging.getLogger(__name__)

# Audio container extensions MediaRecorder / browsers commonly produce.
_ALLOWED_SUFFIXES = {".webm", ".wav", ".mp4", ".m4a", ".ogg", ".mp3"}


class TranscribeResponse(BaseModel):
    text: str


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    audio: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> TranscribeResponse:
    suffix = Path(audio.filename or "").suffix.lower()
    if suffix not in _ALLOWED_SUFFIXES:
        # Browsers usually send webm; fall back to it when the name lacks a suffix.
        suffix = ".webm"

    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        tmp.write(await audio.read())
        tmp.close()
        text = transcribe(tmp.name)
    except ValueError as e:
        # e.g. missing API key
        raise HTTPException(500, str(e))
    except Exception:
        logger.exception("Transcription failed for user %s", current_user.id)
        raise HTTPException(502, "تعذّر تفريغ التسجيل الصوتي.")
    finally:
        try:
            os.unlink(tmp.name)
        except OSError:
            pass

    return TranscribeResponse(text=text)
