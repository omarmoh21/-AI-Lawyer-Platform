import logging
import os
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, module="langgraph")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import health

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
_EXTRA_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    *_EXTRA_ORIGINS,
]

app = FastAPI(title="AI Lawyer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")

logger.info("FastAPI app ready — allowed origins: %s", ALLOWED_ORIGINS)
