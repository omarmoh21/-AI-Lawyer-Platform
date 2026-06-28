
# AI Lawyer

An AI-powered legal assistant built from multiple agents, tools, skills, and backend services (RAG, OCR, ASR, LLMs).

> **Status:** Project scaffolding stage. Agents were prototyped in Colab notebooks; this repo is being structured to hold the production version.

## Project Structure

```
app/
├── agents/        # Agent definitions (intake, research, drafting, review)
├── tools/         # Thin, agent-facing functions (call services under the hood)
├── skills/        # Multi-step procedures that may use several tools together
├── services/      # Core capabilities the tools rely on
│   ├── rag/       # Retrieval-augmented generation (legal docs, case law)
│   ├── ocr/       # Document OCR (uses a dedicated OCR LLM)
│   ├── asr/       # Audio transcription (external ASR API)
│   └── llm/       # LLM clients (main reasoning model, OCR model, etc.)
├── core/          # Base classes, agent loop, tool/skill registry
├── shared/        # Generic utilities (logging, retries, schemas)
└── config/        # Environment and model configuration

notebooks/         # Original Colab prototypes (reference only)
tests/             # Test suite
main.py            # Entry point
```

## Setup

This project uses [uv](https://docs.astral.sh/uv/) for dependency management.

```bash
# 1. Install dependencies
uv sync

# 2. Set up environment variables
cp .env.example .env
# then fill in your API keys

# 3. Install git hooks (required once per clone)
uv run pre-commit install
```

## Environment Variables

See `.env.example` for the required keys (LLM, OCR, ASR, vector DB, etc.). Never commit `.env` — only `.env.example` should be tracked.

## Branching Convention

- `main` holds the agreed project structure — every new branch should start from here.
- Feature branches: `feat/<name>`
- Chores / setup: `chore/<name>`

## Roadmap

- [X] Define project structure (agents / tools / skills / services / core)
- [ ] Migrate notebook prototypes into `app/agents/`
- [ ] Wire up RAG, OCR, ASR services
- [ ] Add CI for linting and tests
