"""Vector parity check: TEI server vs. local sentence-transformers.

Confirms that embeddings from the TEI container match the ones produced by the
in-process SentenceTransformer path currently used to build the Qdrant index.
If cosine similarity is ~1.0 for every sample, TEI can replace the local model
WITHOUT re-indexing. Anything materially below 1.0 means the switch would
silently degrade retrieval.

Run from the backend/ directory with the project venv:
    "D:/AI Lawyer/.venv/Scripts/python.exe" scripts/tei_parity_check.py
"""

import io
import sys

import numpy as np
import requests
from sentence_transformers import SentenceTransformer

# Windows consoles default to cp1252, which cannot encode Arabic previews.
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

# Same model id the app uses (app/config/settings.py: DENSE_MODEL_NAME).
MODEL_NAME = "Omartificial-Intelligence-Space/Arabic-Triplet-Matryoshka-V2"
TEI_URL = "http://localhost:8080/embed"

# A spread of Arabic legal-flavoured texts: short, long, punctuation, digits.
SAMPLES = [
    "المادة الأولى من الدستور المصري",
    "يعاقب بالحبس مدة لا تقل عن سنة كل من ارتكب جريمة الاحتيال",
    "عقد إيجار بين الطرف الأول والطرف الثاني بشأن الوحدة السكنية رقم ١٢٣",
    "ما هي شروط صحة العقد وفقاً للقانون المدني؟",
    "نصت المادة 40 على أن المواطنين لدى القانون سواء",
]


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def tei_embed(text: str) -> np.ndarray:
    resp = requests.post(TEI_URL, json={"inputs": text, "normalize": True}, timeout=60)
    resp.raise_for_status()
    return np.asarray(resp.json()[0], dtype=np.float64)


def main() -> int:
    print(f"Loading local model: {MODEL_NAME} ...")
    model = SentenceTransformer(MODEL_NAME)

    print("Embedding samples through both paths...\n")
    print(f"{'#':>2}  {'cosine':>10}  {'max_diff':>10}  text")
    print("-" * 70)

    sims = []
    for i, text in enumerate(SAMPLES, 1):
        local_vec = model.encode(text, normalize_embeddings=True).astype(np.float64)
        tei_vec = tei_embed(text)

        if local_vec.shape != tei_vec.shape:
            print(f"{i:>2}  DIM MISMATCH local={local_vec.shape} tei={tei_vec.shape}")
            return 2

        sim = cosine(local_vec, tei_vec)
        max_abs_diff = float(np.max(np.abs(local_vec - tei_vec)))
        sims.append(sim)
        preview = text[:32] + ("…" if len(text) > 32 else "")
        print(f"{i:>2}  {sim:>10.6f}  {max_abs_diff:>10.6f}  {preview}")

    worst = min(sims)
    mean = sum(sims) / len(sims)
    print("-" * 70)
    print(f"mean cosine: {mean:.6f}   worst cosine: {worst:.6f}")

    # Gate: 0.9999 tolerates float32/backend rounding but catches real drift.
    if worst >= 0.9999:
        print(
            "\n✅ PASS — vectors match. TEI can replace the local model with NO re-index."
        )
        return 0
    print(
        "\n❌ FAIL — vectors differ. Do NOT switch without re-indexing / investigating."
    )
    return 1


if __name__ == "__main__":
    sys.exit(main())
