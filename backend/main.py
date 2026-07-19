import logging
import os
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, module="langgraph")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import articles, auth, chat, contracts, documents, health, transcribe
from app.db.database import Base, engine
from app.db import models  # noqa: F401 — ensures models are registered before create_all

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

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Lawyer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(articles.router, prefix="/api")
app.include_router(contracts.router, prefix="/api")
app.include_router(transcribe.router, prefix="/api")

logger.info("FastAPI app ready — allowed origins: %s", ALLOWED_ORIGINS)
