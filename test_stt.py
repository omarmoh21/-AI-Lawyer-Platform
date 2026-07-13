"""
Quick test for the ElevenLabs STT API.
Usage:
    python test_stt.py <path_to_audio_file>
    python test_stt.py                        # records 5 seconds from mic then transcribes
"""

import os
import sys
import time
import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY  = os.getenv("ELEVENLABS_API_KEY")
MODEL_ID = "scribe_v2"
API_URL  = "https://api.elevenlabs.io/v1/speech-to-text"


def transcribe(audio_path: str) -> str:
    if not API_KEY:
        raise ValueError("ELEVENLABS_API_KEY not found in .env")

    mime = "audio/wav" if audio_path.lower().endswith(".wav") else "audio/webm"

    print(f"  File : {audio_path}")
    print(f"  MIME : {mime}")
    print(f"  Model: {MODEL_ID}")
    print("  Sending to ElevenLabs...\n")

    t0 = time.time()
    with open(audio_path, "rb") as f:
        resp = requests.post(
            API_URL,
            headers={"xi-api-key": API_KEY},
            data={"model_id": MODEL_ID},
            files={"file": (os.path.basename(audio_path), f, mime)},
            timeout=120,
        )
    elapsed = time.time() - t0

    print(f"  Status : {resp.status_code}  ({elapsed:.1f}s)")

    if not resp.ok:
        print(f"  Error  : {resp.text}")
        resp.raise_for_status()

    data = resp.json()
    text = data.get("text", "").strip()
    return text


def record_from_mic(seconds: int = 5, out_path: str = "test_recording.wav") -> str:
    try:
        import sounddevice as sd
        import soundfile as sf
        import numpy as np
    except ImportError:
        print("Install sounddevice + soundfile to use mic recording:")
        print("  pip install sounddevice soundfile")
        sys.exit(1)

    sr = 16000
    print(f"Recording {seconds}s from microphone (sample rate {sr})...")
    audio = sd.rec(int(seconds * sr), samplerate=sr, channels=1, dtype="int16")
    sd.wait()
    sf.write(out_path, audio, sr)
    print(f"Saved to {out_path}\n")
    return out_path


if __name__ == "__main__":
    if len(sys.argv) >= 2:
        path = sys.argv[1]
        if not os.path.exists(path):
            print(f"File not found: {path}")
            sys.exit(1)
    else:
        path = record_from_mic(seconds=5)

    print("=" * 50)
    result = transcribe(path)
    print("=" * 50)
    print("Transcript:")
    print(result if result else "(empty — no speech detected)")
