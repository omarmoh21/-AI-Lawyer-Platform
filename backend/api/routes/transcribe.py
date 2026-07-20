"""Speech-to-text endpoint — wraps the ElevenLabs Scribe ASR service.

The frontend records the user's voice (MediaRecorder → webm/mp4 blob) and posts
it here; we save it to a temp file, transcribe it, and return the text so the
client can drop it into the chat input.
"""

import asyncio
import json
import logging
import os
import tempfile
from pathlib import Path

import websockets
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.auth.dependencies import get_current_user
from app.auth.security import decode_access_token
from app.config.settings import AUTH_COOKIE_NAME, ELEVENLABS_API_KEY
from app.db.models import User
from app.services.asr.elevenlabs_asr import transcribe

router = APIRouter(tags=["transcribe"])
logger = logging.getLogger(__name__)

# ElevenLabs Scribe realtime STT — streams partial transcripts while speaking.
_REALTIME_WS = "wss://api.elevenlabs.io/v1/speech-to-text/realtime"
_REALTIME_PARAMS = (
    "model_id=scribe_v2_realtime"
    "&audio_format=pcm_16000"
    "&commit_strategy=vad"
    "&language_code=ara"
)

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
        text = await transcribe(tmp.name)
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


@router.websocket("/transcribe/stream")
async def transcribe_stream(ws: WebSocket) -> None:
    """Realtime STT proxy. The browser streams base64 PCM-16k audio here; we
    relay it to ElevenLabs Scribe realtime and stream partial/final transcripts
    back. The ElevenLabs key never reaches the browser.

    Client → server:  {"audio": "<base64 pcm16>"}  |  {"type": "stop"}
    Server → client:  {"type": "partial"|"final", "text": ...}  |  {"type": "error", "message": ...}
    """
    # Authenticate from the auth cookie sent on the WS handshake (same-site).
    token = ws.cookies.get(AUTH_COOKIE_NAME)
    user_id = decode_access_token(token) if token else None
    if user_id is None:
        await ws.close(code=1008)  # policy violation / unauthenticated
        return

    await ws.accept()
    if not ELEVENLABS_API_KEY:
        await ws.send_json({"type": "error", "message": "خدمة التفريغ غير مهيأة."})
        await ws.close()
        return

    url = f"{_REALTIME_WS}?{_REALTIME_PARAMS}"
    try:
        async with websockets.connect(
            url, additional_headers={"xi-api-key": ELEVENLABS_API_KEY}, max_size=None
        ) as upstream:

            async def client_to_upstream() -> None:
                try:
                    while True:
                        data = json.loads(await ws.receive_text())
                        if data.get("type") == "stop":
                            await upstream.send(
                                json.dumps({
                                    "message_type": "input_audio_chunk",
                                    "audio_base_64": "",
                                    "sample_rate": 16000,
                                    "commit": True,
                                })
                            )
                            continue
                        audio = data.get("audio")
                        if audio:
                            await upstream.send(
                                json.dumps({
                                    "message_type": "input_audio_chunk",
                                    "audio_base_64": audio,
                                    "sample_rate": 16000,
                                    "commit": False,
                                })
                            )
                except WebSocketDisconnect:
                    pass

            async def upstream_to_client() -> None:
                async for raw in upstream:
                    msg = json.loads(raw)
                    mt = msg.get("message_type")
                    if mt == "partial_transcript":
                        await ws.send_json({"type": "partial", "text": msg.get("text", "")})
                    elif mt in ("committed_transcript", "committed_transcript_with_timestamps"):
                        await ws.send_json({"type": "final", "text": msg.get("text", "")})
                    elif mt and mt.endswith("error"):
                        await ws.send_json(
                            {"type": "error", "message": msg.get("error", "خطأ في التفريغ")}
                        )

            t_up = asyncio.create_task(client_to_upstream())
            t_down = asyncio.create_task(upstream_to_client())
            _, pending = await asyncio.wait(
                {t_up, t_down}, return_when=asyncio.FIRST_COMPLETED
            )
            for task in pending:
                task.cancel()
    except Exception:
        logger.exception("realtime transcription proxy failed for user %s", user_id)
        try:
            await ws.send_json({"type": "error", "message": "تعذّر الاتصال بخدمة التفريغ."})
        except Exception:
            pass
    finally:
        try:
            await ws.close()
        except Exception:
            pass
