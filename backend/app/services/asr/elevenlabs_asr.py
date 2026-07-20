import os
import logging
import httpx

from app.config.settings import ELEVENLABS_API_KEY, STT_MODEL_ID

logger = logging.getLogger(__name__)

_URL = "https://api.elevenlabs.io/v1/speech-to-text"


async def transcribe(audio_path: str) -> str:
    """Send an audio file to ElevenLabs Scribe and return the transcript."""
    if not ELEVENLABS_API_KEY:
        raise ValueError("ELEVENLABS_API_KEY not set in .env")

    mime = "audio/wav" if audio_path.lower().endswith(".wav") else "audio/webm"
    logger.info("ASR start — %s", audio_path)

    with open(audio_path, "rb") as f:
        content = f.read()

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            _URL,
            headers={"xi-api-key": ELEVENLABS_API_KEY},
            data={"model_id": STT_MODEL_ID},
            files={"file": (os.path.basename(audio_path), content, mime)},
        )

    resp.raise_for_status()
    text = resp.json().get("text", "").strip()
    logger.info("ASR done — %d chars: %r", len(text), text[:80])
    return text
