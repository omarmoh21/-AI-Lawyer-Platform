---
title: AI Lawyer — Egyptian Legal Assistant
emoji: ⚖️
colorFrom: yellow
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# AI Lawyer — Egyptian Legal Assistant

An AI-powered legal assistant specialized in Egyptian law: legal Q&A over a hybrid
(dense + BM25) retrieval pipeline, legal article lookup, contract drafting, document
OCR/analysis, and voice input — built on FastAPI + LangGraph on the backend and
React + Vite on the frontend.

## Architecture

| Component | What it does | Where it runs |
|---|---|---|
| **Frontend** | React/Vite UI | `frontend-v2/` — `npm run dev`, port `5173` |
| **Backend** | FastAPI + LangGraph agents (legal research, contracts, documents) | `backend/` — `uvicorn`, port `8000` |
| **TEI (Text Embeddings Inference)** | Serves the dense embedding model out-of-process | Docker container, port `8080` |
| **Qdrant** | Vector database for hybrid legal search | Qdrant Cloud (external, configured via `.env`) |
| **Cohere Rerank** *(optional)* | Best-effort relevance reranking of search results | Cohere API (external, off by default) |

The backend does **not** load the embedding model in-process — dense embeddings are
served by the TEI container over HTTP. This is why TEI must be running before the
backend can serve legal search / chat requests (see below).

Database schema is managed by **Alembic** (`backend/alembic/`) — the app no longer
creates tables itself at startup; migrations must be applied explicitly.

---

## Local development

### Prerequisites

- **Docker Desktop** (for the TEI embedding server)
- **Python 3.12+** and a virtual environment with the backend dependencies installed
  (`pip install -r backend/requirements.txt`)
- **Node.js** (for the frontend — `npm install` in `frontend-v2/`)
- API keys for: Gemini, Qdrant, ElevenLabs (voice), optionally Cohere (rerank) and
  LangSmith (tracing) — see `backend/.env.example`

### Running the app — **run these in order**

#### 1. Start the TEI embedding server (Docker) — do this first

```bash
docker compose up -d
```

This starts the `tei-embedder` container defined in `docker-compose.yml`, serving the
Arabic dense embedding model at `http://localhost:8080`. The model is mounted from
your local Hugging Face cache (`HF_CACHE_DIR`, defaults to the standard Windows cache
path), so after the first run it starts quickly without re-downloading.

Verify it's healthy before moving on:

```bash
curl http://localhost:8080/health
```

> **Why this has to come first:** the backend's legal search and chat endpoints call
> out to TEI for every query. If TEI isn't running, those specific requests will fail
> or time out — everything else (auth, contracts, document upload) still works
> independently, but legal search/chat won't function correctly until TEI is up.

#### 2. Configure the backend environment

```bash
cd backend
cp .env.example .env
# then fill in GEMINI_API_KEY, QDRANT_URL, QDRANT_API_KEY, ELEVENLABS_API_KEY, etc.
```

#### 3. Apply database migrations

```bash
cd backend
alembic upgrade head
```

#### 4. Start the backend

```bash
cd backend
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

Wait for `Application startup complete` in the logs, then confirm:

```bash
curl http://127.0.0.1:8000/api/health
```

#### 5. Start the frontend

```bash
cd frontend-v2
npm install   # first time only
npm run dev
```

Open **http://localhost:5173**.

### Stopping everything

```bash
# stop the backend / frontend dev servers with Ctrl+C, then:
docker compose down   # stops the TEI container
```

### Troubleshooting

- **Docker Desktop not running / `docker` commands fail with a pipe error** — start
  Docker Desktop and wait for it to fully initialize before running `docker compose up -d`.
- **First TEI request after a machine sleep/idle period is very slow or times out** —
  this is a known WSL2/Docker behavior: containers pause when Windows sleeps, and the
  first request after waking can take much longer than usual while it resumes. A
  simple retry (or a warm-up `curl http://localhost:8080/health`) resolves it.
- **`.env` missing values** — the backend reads `backend/.env` once at startup; if you
  edit it, restart the backend (`--reload` does *not* pick up `.env` changes).
- See `PERFORMANCE_ANALYSIS.md` for known throughput bottlenecks under concurrent load.

---

## Deployment (Hugging Face Spaces)

The `Dockerfile` at the repo root packages the whole app — TEI, the backend, and the
built frontend — into a **single container**, matching what the `sdk: docker` /
`app_port: 7860` front-matter above tells Spaces to run.

- `frontend-v2` is built (`npm run build`) in a Node stage and served by FastAPI as
  static files, with an SPA fallback so client-side routes survive a refresh — the
  API and UI share one origin, so there's no CORS setup to manage in production.
- The dense embedding model is **baked into the image at build time** (a dedicated
  build stage pre-downloads it into the HF cache layout), so TEI never needs network
  access to fetch weights at container start.
- `entrypoint.sh` starts TEI, waits for it to report healthy, runs
  `alembic upgrade head`, then hands off to `uvicorn` as the foreground process.
- **Secrets/variables** (`GEMINI_API_KEY`, `QDRANT_URL`, `QDRANT_API_KEY`,
  `ELEVENLABS_API_KEY`, `COHERE_API_KEY`, `RERANK_ENABLED`, `JWT_SECRET_KEY`,
  LangSmith vars) are set via the Space's own **Settings → Variables and secrets**
  UI — the app reads them the same way it reads `backend/.env` locally
  (`os.getenv(...)`), no code changes needed.
- **Storage is ephemeral**: `app.db` (SQLite) lives on the container's local disk and
  is reset on every restart/redeploy — a deliberate tradeoff for this deployment, not
  a bug. See `PERFORMANCE_ANALYSIS.md` for the reasoning.

To build and run it locally exactly as the Space would:

```bash
docker build -t ai-lawyer .
docker run -p 7860:7860 --env-file backend/.env ai-lawyer
# open http://localhost:7860
```

## Project structure

```
backend/        FastAPI app, LangGraph agents, RAG pipeline, auth, DB models, Alembic migrations
frontend-v2/    React + Vite UI (current)
frontend/       Prior frontend iteration, not deployed
evaluation/     Retrieval/generation evaluation scripts and datasets
docker-compose.yml   TEI embedding server (local development)
Dockerfile           Single-container build for Hugging Face Spaces deployment
entrypoint.sh        Container startup: TEI → health check → migrations → uvicorn
```
