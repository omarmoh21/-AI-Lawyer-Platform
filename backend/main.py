import logging
import os
import warnings
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

# Suppress langgraph's import-time DeprecationWarnings. Must run before the
# local imports below that transitively pull in langgraph (via the agents).
warnings.filterwarnings("ignore", category=DeprecationWarning, module="langgraph")

from api.routes import articles, auth, chat, contracts, documents, health, transcribe  # noqa: E402
from app.core.limiter import limiter  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("app.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)

# Comma-separated list of extra allowed origins, e.g. for a deployed frontend.
# The Vite dev server origins are always allowed.
_EXTRA_ORIGINS = [
    o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()
]
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    *_EXTRA_ORIGINS,
]

app = FastAPI(title="AI Lawyer API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SlowAPIMiddleware)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(articles.router, prefix="/api")
app.include_router(contracts.router, prefix="/api")
app.include_router(transcribe.router, prefix="/api")

# ── Serve the built frontend (single-origin production deployment) ─────────
# The Docker build copies frontend-v2/dist here. When present, FastAPI serves
# the SPA from the same origin as the API, so no CORS/cross-port setup is
# needed. Skipped entirely in local dev, where the frontend runs on its own
# Vite server and this directory doesn't exist.
_FRONTEND_DIR = Path(
    os.getenv("FRONTEND_DIST", Path(__file__).parent / "static")
).resolve()

if _FRONTEND_DIR.is_dir():
    # Hashed JS/CSS/asset bundles emitted by Vite under dist/assets/.
    app.mount(
        "/assets",
        StaticFiles(directory=_FRONTEND_DIR / "assets"),
        name="assets",
    )

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str) -> FileResponse:
        """Serve real static files (favicon, etc.) directly; fall back to
        index.html for everything else so client-side routes (React Router)
        resolve on direct navigation or refresh. The /api/* routers are
        registered above and take precedence over this catch-all."""
        # Never let the SPA fallback swallow unmatched API requests.
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not found")
        candidate = (_FRONTEND_DIR / full_path).resolve()
        # Path-traversal guard: only serve files that live under the dist dir.
        if full_path and candidate.is_file() and _FRONTEND_DIR in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(_FRONTEND_DIR / "index.html")

    logger.info("Serving built frontend from %s", _FRONTEND_DIR)

logger.info("FastAPI app ready — allowed origins: %s", ALLOWED_ORIGINS)
