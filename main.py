from dataclasses import dataclass
from pathlib import Path

import uvicorn
from litestar import Litestar, get, post
from litestar.contrib.jinja import JinjaTemplateEngine
from litestar.response import Template
from litestar.static_files import StaticFilesConfig
from litestar.template.config import TemplateConfig
from qdrant_client import QdrantClient

from app.config.settings import Settings
from app.services.rag.retriever import retrieve
from app.services.rag.generator import generate_answer

# ── Base dir ───────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent

# ── App-wide singletons ────────────────────────────────────────────
settings = Settings()

qdrant_client = QdrantClient(
    url=settings.QDRANT_URL,
    api_key=settings.QDRANT_API_KEY,
    timeout=300,
)


# ── Request schema ─────────────────────────────────────────────────
@dataclass
class LegalChatRequest:
    query: str


# ── Route handlers ─────────────────────────────────────────────────
@get("/")
async def index() -> Template:
    return Template(template_name="index.html")


@get("/item/{item_id:int}")
async def get_item(item_id: int) -> dict[str, int]:
    return {"item_id": item_id}


@get("/chat")
async def chat_page() -> Template:
    return Template(template_name="chat.html")


@post("/legal-chat")
async def legal_chat(data: LegalChatRequest) -> dict[str, str]:
    top_docs = retrieve(data.query, qdrant_client, settings)
    ans = generate_answer(data.query, top_docs, settings)
    return {"answer": ans}


# ── App factory ────────────────────────────────────────────────────
def create_app() -> Litestar:
    return Litestar(
        route_handlers=[index, get_item, chat_page, legal_chat],
        debug=settings.DEBUG,
        template_config=TemplateConfig(
            directory=BASE_DIR / "templates",
            engine=JinjaTemplateEngine,
        ),
        static_files_config=[
            StaticFilesConfig(
                directories=[BASE_DIR / "static"],
                path="/static",
                name="static",
            )
        ],
    )


if __name__ == "__main__":
    uvicorn.run(
        "main:create_app", host="127.0.0.1", reload=True, port=8000, factory=True
    )
