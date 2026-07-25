import logging
import os
import time
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, module="langgraph")

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from api.routes import admin, articles, auth, chat, contracts, documents, health, transcribe
from app.core import metrics
from app.core.limiter import limiter

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
# The Vite dev server origins are always allowed. Vite auto-increments its port
# (5174, 5175…) when 5173 is taken, so allow the common range out of the box —
# otherwise the browser's CORS preflight fails whenever the port shifts.
_EXTRA_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
_VITE_PORTS = (5173, 5174, 5175)
ALLOWED_ORIGINS = [
    *(f"http://localhost:{p}" for p in _VITE_PORTS),
    *(f"http://127.0.0.1:{p}" for p in _VITE_PORTS),
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


@app.middleware("http")
async def track_metrics(request: Request, call_next):
    # Skip the dashboard's own polling so it doesn't drown out real traffic
    # in the "requests per minute" stat.
    if request.url.path.startswith("/api/admin"):
        return await call_next(request)

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start) * 1000
    client_ip = request.client.host if request.client else "unknown"
    metrics.record(client_ip, request.method, request.url.path, response.status_code, duration_ms)
    return response


app.include_router(health.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(articles.router, prefix="/api")
app.include_router(contracts.router, prefix="/api")
app.include_router(transcribe.router, prefix="/api")

logger.info("FastAPI app ready — allowed origins: %s", ALLOWED_ORIGINS)
