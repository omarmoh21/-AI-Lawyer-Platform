# المستشار — Al-Mustashar

An AI legal assistant for **Egyptian law**. Ask a legal question in Arabic and get an
answer grounded in the actual statute text, with the articles it relied on cited back
to you — plus contract drafting, document analysis, article lookup, and voice input.

Built with FastAPI + LangGraph on the backend and React + Vite on the frontend.
Retrieval is hybrid (dense + BM25) over a Qdrant index of Egyptian legislation.

> **Scope and limits.** This is a graduation project and a research prototype. It is an
> informational tool, not legal advice, and does not replace a licensed lawyer. See
> [Evaluation](#evaluation) for measured accuracy — including where it fails.

---

## Features

| Feature | What it does |
|---|---|
| **الاستشارة** — Consultation | Chat-style legal Q&A. Answers stream token-by-token and cite the articles behind them. Supports follow-up questions with full conversation memory. |
| **مواد القانون** — Article lookup | Look up a specific article by law + number, or search by plain-language topic. |
| **دليل الإجراءات** — Procedure guides | Step-by-step walkthroughs of common procedures (filing a case, divorce, company formation…), with required documents, fees, and the relevant articles. |
| **تحرير عقد** — Contract drafting | Fills contract templates from a guided form and exports a properly formatted **right-to-left Arabic Word document**. |
| **Document analysis** | Upload a PDF or image; Gemini OCR extracts the text for review, then the agent analyses it. |
| **Voice input** | Dictate questions in Arabic via ElevenLabs speech-to-text. |
| **Guest mode** | One-click "الدخول كزائر" — try the full app with no signup. Guest accounts and all their data are deleted on logout. |

## Architecture

```
                 ┌──────────────────────────────┐
  Browser ──────▶│  React + Vite  (frontend-v2) │
                 └──────────────┬───────────────┘
                                │  /api  (same-origin, proxied in dev)
                 ┌──────────────▼───────────────┐
                 │   FastAPI  ·  LangGraph      │
                 │   supervisor → sub-agents    │
                 └──┬─────────┬─────────┬───────┘
                    │         │         │
        ┌───────────▼──┐  ┌───▼────┐  ┌─▼──────────────┐
        │ TEI embedder │  │ Qdrant │  │ Gemini / 11Labs│
        │  (Docker)    │  │ (cloud)│  │   (external)   │
        └──────────────┘  └────────┘  └────────────────┘
```

A **supervisor agent** routes each request to the right specialist: legal research
(RAG over the statute index), contract drafting, or document/OCR analysis.

Retrieval runs dense and BM25 search in parallel, fuses them with **Reciprocal Rank
Fusion**, and optionally reranks with Cohere. Reranking is strictly best-effort — if
it's disabled, rate-limited, or unavailable, search silently falls back to the RRF
ordering and never blocks a user.

The backend does **not** load the embedding model in-process. Dense embeddings are
served by the TEI container over HTTP, which is why TEI must be running before legal
search and chat will work.

| Component | Role | Where it runs |
|---|---|---|
| Frontend | React + Vite UI (Arabic, RTL) | `frontend-v2/` — port `5174` |
| Backend | FastAPI + LangGraph agents | `backend/` — port `8000` |
| TEI | Serves the Arabic dense embedding model | Docker, port `8080` |
| Qdrant | Vector DB for hybrid legal search | Qdrant Cloud (external) |
| Gemini | LLM for answers, and OCR | Google AI (external) |
| ElevenLabs | Arabic speech-to-text | External |
| Cohere Rerank | Optional relevance reranking | External, **off by default** |

## Quick start

### Prerequisites

- **Docker Desktop** — for the TEI embedding server
- **Python 3.12+**
- **Node.js 18+**
- API keys: Gemini, Qdrant, ElevenLabs. Optional: Cohere (rerank), LangSmith (tracing).

### 1. Start the embedding server — do this first

```bash
docker compose up -d
curl http://localhost:8080/health     # confirm it's up before continuing
```

The model is mounted from your Hugging Face cache, so only the first run downloads it.
If your cache isn't at `~/.cache/huggingface`, set `HF_CACHE_DIR` before running.

> **Why first:** every legal search and chat request calls TEI. Without it those
> endpoints fail — auth, contracts, and uploads still work, but search/chat won't.

### 2. Backend

```bash
cd backend
cp .env.example .env          # then fill in your API keys
pip install -r requirements.txt
alembic upgrade head          # create the SQLite schema
uvicorn main:app --port 8000
```

Check it: `curl http://localhost:8000/api/health` → `{"status":"ok"}`

### 3. Frontend

```bash
cd frontend-v2
cp .env.example .env
npm install
npm run dev
```

Open **http://localhost:5174** and click **الدخول كزائر** to skip signup.

To share a running instance publicly (e.g. for testing on a phone), see
**[RUNNING.md](RUNNING.md)**, which covers the Cloudflare Tunnel setup.

## Evaluation

Two independent evaluations, both reproducible from `evaluation/`.

**Retrieval** — 591 question/article pairs across Egyptian legislation.
Measures whether the correct article is retrieved, before any reranking.

| K | Recall@K | Precision@K |
|---|---|---|
| 1 | 83.6% | 81.4% |
| 3 | 87,2% | 83.9% |
| 5 | 91.4%% | 85.6% |

MRR **0.869** · target article never in top-5 for **22.3%** of queries.

Precision@K falls as K grows by construction: each query has exactly one correct
article, so precision@K = recall@K / K.

**End-to-end answers** — 130 questions scored by comparing each answer against a
checklist built from the literal statute text:

| Result | Count | |
|---|---|---|
| Correct, exact article cited | 116 | 90.5% |
| Correct conclusion, weaker citation | 8 | 5.3% |
| Wrong or misleading | 6 | 4.2% |

Full write-ups, including every failure case, are in
[`evaluation/domain_expert_eval_100_report.md`](evaluation/domain_expert_eval_100_report.md)
and [`evaluation/retrieval_eval_report.md`](evaluation/retrieval_eval_report.md).

Reproduce:

```bash
python evaluation/eval_retrieval.py      # retrieval — needs TEI + Qdrant
python evaluation/generation_eval.py     # RAGAS generation metrics — needs Gemini quota
```

### Known limitations

- **~12% of queries never retrieve the right article** in the top 5. Recall@1 of 83%
  means the single best hit is not true the whole  time; the agent compensates by
  reading several candidates, but hard queries still fail.
- **4% of end-to-end answers were wrong or misleading** in expert review.
- Coverage is limited to the laws indexed in Qdrant — it will answer confidently about
  areas it has no source text for.
- Arabic dialect handling in voice input is limited; speech-to-text is pinned to
  Modern Standard Arabic.

## Project structure

```
backend/
  api/routes/      FastAPI endpoints (auth, chat, articles, contracts, documents, admin)
  app/agents/      LangGraph supervisor + specialist agents
  app/services/    RAG (Qdrant/TEI/rerank), OCR, ASR, Word export, scraping
  app/tools/       Tools the agents call
  alembic/         Database migrations
frontend-v2/       React + Vite UI (the live app)
evaluation/        Evaluation scripts, datasets, and reports
docker-compose.yml TEI embedding server
RUNNING.md         Local + public-tunnel run instructions
```

## Operations

A live monitoring dashboard is served at **`/api/admin/monitor`** — request traffic,
distinct visitors, response times, and process/system CPU and memory. It refreshes
every 2 seconds.

> It is **unauthenticated by design** as a local operator tool, and shows visitor IP
> addresses. Don't expose it publicly alongside the app.

## Troubleshooting

- **Docker commands fail with a pipe error** — start Docker Desktop and wait for it to
  finish initializing.
- **First TEI request after sleep is very slow** — known WSL2/Docker behaviour;
  containers pause when Windows sleeps. Retry, or warm it up with a `curl` to
  `/health`.
- **`.env` edits don't take effect** — the backend reads it once at startup. Restart it;
  `--reload` does not pick up `.env` changes.
- **"Not authenticated" right after logging in** — the frontend and backend are being
  served from different domains, making the auth cookie cross-site. Either use the Vite
  proxy (leave `VITE_API_BASE_URL` empty) or set `COOKIE_CROSS_SITE=true` on the backend.
- See [PERFORMANCE_ANALYSIS.md](PERFORMANCE_ANALYSIS.md) for throughput bottlenecks
  under concurrent load.

## License

Apache License 2.0 — see [LICENSE](LICENSE).
