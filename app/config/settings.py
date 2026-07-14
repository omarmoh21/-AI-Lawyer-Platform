import os
from dotenv import load_dotenv

load_dotenv()

# ── API keys ───────────────────────────────────────────────────
GEMINI_API_KEY     = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
QDRANT_URL         = os.getenv("QDRANT_URL")
QDRANT_API_KEY     = os.getenv("QDRANT_API_KEY")

# ── Qdrant ─────────────────────────────────────────────────────
COLLECTION_NAME     = "egypt_law_v2"
ARTICLES_COLLECTION = "articles"

# ── Models ─────────────────────────────────────────────────────
DENSE_MODEL_NAME = "Omartificial-Intelligence-Space/Arabic-Triplet-Matryoshka-V2"
GEMINI_MODEL     = "gemini-3.1-flash-lite"
LLM_MODEL        = "gemini-3.1-flash-lite"
STT_MODEL_ID     = "scribe_v2"

# ── Search ─────────────────────────────────────────────────────
TOP_K        = 10
RERANK_TOP_K = 5


def make_llm(temperature: float = 0.1):
    """Return a ChatGoogleGenerativeAI instance using the existing Gemini API key."""
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        temperature=temperature,
        google_api_key=GEMINI_API_KEY,
    )
