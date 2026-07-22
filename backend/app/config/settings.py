import os
from dotenv import load_dotenv

load_dotenv()

# ── API keys ───────────────────────────────────────────────────
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL")
QDRANT_API_KEY = os.getenv("QDRANT_API_KEY")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

# ── Qdrant ─────────────────────────────────────────────────────
COLLECTION_NAME = "egypt_law_v2"
ARTICLES_COLLECTION = "articles"

# ── Models ─────────────────────────────────────────────────────
DENSE_MODEL_NAME = "Omartificial-Intelligence-Space/Arabic-Triplet-Matryoshka-V2"
GEMINI_MODEL = "gemini-3.1-flash-lite"
LLM_MODEL = "gemini-3.1-flash-lite"
STT_MODEL_ID = "scribe_v2"

# ── Search ─────────────────────────────────────────────────────
TOP_K = 10
RERANK_TOP_K = 5

# ── Reranking (Cohere) ─────────────────────────────────────────
# Best-effort relevance reranking over the fused candidates. When disabled or
# when Cohere is unavailable (429/quota/network), the pipeline transparently
# falls back to the raw RRF ordering — reranking never blocks or breaks search.
RERANK_ENABLED = os.getenv("RERANK_ENABLED", "false").lower() == "true"
COHERE_RERANK_MODEL = os.getenv(
    "COHERE_RERANK_MODEL", "rerank-v3.5"
)  # multilingual, strong Arabic
RERANK_CANDIDATES = 15  # how many fused hits to send to the reranker
# Trial key is limited to 10 req/min; keep a safe gap between calls. If a call
# would arrive sooner than this, we skip reranking for that request (fallback)
# rather than blocking the user.
RERANK_MIN_INTERVAL_SEC = 6.5

# ── Embeddings (TEI) ───────────────────────────────────────────
# Dense embeddings are served out-of-process by a Text Embeddings Inference
TEI_EMBED_URL = os.getenv("TEI_EMBED_URL", "http://localhost:8080/embed")

# ── Auth ───────────────────────────────────────────────────────
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-insecure-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days
AUTH_COOKIE_NAME = "access_token"
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")


def make_llm(temperature: float = 0.1):
    """Return a ChatGoogleGenerativeAI instance using the existing Gemini API key."""
    from langchain_google_genai import ChatGoogleGenerativeAI

    return ChatGoogleGenerativeAI(
        model=LLM_MODEL,
        temperature=temperature,
        google_api_key=GEMINI_API_KEY,
    )
