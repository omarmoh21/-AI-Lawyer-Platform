# Changelog — AI Lawyer Platform

## [0.2.0] — 2026-07-01

### Project restructure: monolithic → package architecture

The entire codebase was migrated from a single `main.py` file into a proper
Python package structure matching the `chore/scaffold-project-structure` branch:

```
app/
├── config/settings.py          — all env vars and constants
├── core/models.py              — shared model instances (Qdrant, dense, BM25)
├── services/
│   ├── ocr/gemini_ocr.py      — Gemini OCR with 503 retry logic
│   ├── asr/elevenlabs_asr.py  — ElevenLabs speech-to-text
│   ├── rag/qdrant_search.py   — hybrid dense+BM25 search with RRF fusion
│   ├── document/docx_generator.py — styled Arabic .docx generation
│   └── scraping/lawhub_scraper.py — live contract fetch from lawhub.info
├── tools/
│   ├── legal_search_tool.py
│   ├── article_search_tool.py
│   ├── ocr_tool.py
│   ├── contract_tools.py      — list/preview/generate local templates
│   └── lawhub_tools.py        — search/fetch from lawhub.info
├── agents/
│   ├── legal_research_agent.py
│   ├── document_agent.py
│   ├── contract_agent.py
│   └── supervisor.py          — orchestrates all three agents
├── templates/contracts.py      — 4 verified Egyptian law contract templates
├── skills/                     — reserved for future skills
├── shared/                     — reserved for utilities
└── assets/                     — reserved for static files
```

---

### Multi-agent architecture

Replaced the single ReAct agent with a **Supervisor + 3 specialist agents** pattern:

| Agent | Handles | Tools |
|---|---|---|
| **Supervisor** | Routes requests, pre-processes OCR | ask_legal_research, ask_document_agent, ask_contract_agent |
| **Legal Research** | Egyptian law Q&A, article lookup | legal_search, article_search_tool |
| **Document** | OCR extraction, document analysis | ocr_tool |
| **Contract** | Contract generation (local + live fetch) | preview_contract, search_lawhub_contracts, fetch_lawhub_contract, … |

**Routing flow:**
```
User input
  → Supervisor (dialect normalization, OCR pre-processing)
      ├── Legal question          → Legal Research Agent
      ├── Image/document upload   → Document Agent → optionally Legal Research
      └── Contract request        → Contract Agent
```

**LangGraph recursion limits** set explicitly to prevent `GraphRecursionError`:
- Sub-agents: `recursion_limit=50`
- Supervisor: `recursion_limit=100`

**LLM summarization bypass:** both the contract agent and supervisor were
bypassed at the tool-message level to prevent GPT-4o-mini from paraphrasing
contract text instead of returning it verbatim. Raw tool output is extracted
directly from LangGraph message history.

---

### Contract generation

#### Local templates (4 types, verified)

Templates rewritten to match **real-world Egyptian legal formats**:

| Type | Source | Format |
|---|---|---|
| **Rental** (عقد إيجار أملاك) | Scanned official document — Law 4/1996 | 17 numbered بنود |
| **Employment** (عقد عمل) | lawyeregypt.net structure + Labor Law 12/2003 | 10 Articles |
| **NDA** (اتفاقية سرية) | Egyptian law standard — Civil Code | 9 Articles |
| **Sale** (عقد بيع) | Cairo Chamber + Civil Code Arts. 439, 447 | 13 numbered بنود |

AI-generated "أولاً/ثانياً" section headers replaced with the authentic flat
numbered "البند الأول / الثاني…" format used by Egyptian lawyers in practice.

#### Live fetch from lawhub.info

New `lawhub_scraper` service fetches contracts on-demand from
**الموسوعة القانونية** (lawhub.info), covering 25 contract categories and
hundreds of contract types not in the local templates:

- `search_contracts(query)` — uses the site's own WordPress search engine
  (`?s=query`) for free-text cross-category matching (more reliable than
  guessing categories)
- `list_contracts(category)` — browses a specific category by stable numeric ID
- `fetch_contract_text(post_id)` — fetches and cleans article content
  (strips duplicate "copy widget" block, relative-date stamps, share buttons)
- File-based cache: 3-day TTL for search results, 7-day for category listings,
  30-day for individual contract text

**Bug fixed:** agent was selecting wrong contracts (e.g. "صيانة وترميم عقار"
for a request for "صيانة كمبيوتر") because it guessed categories from keywords
instead of searching by title. Replaced with free-text search as the primary
lookup method. Title-match verification rule added to agent prompt.

---

### OCR (Gemini)

- Gemini 503 overload errors: retry logic added (up to 3 attempts, 5s/10s delays)
- OCR now runs as a **pre-processing step** in `supervisor.run()` before the
  agent is invoked — eliminates the path-parsing bug where Windows backslash
  paths in repr() were misinterpreted by GPT-4o-mini

---

### ASR (ElevenLabs)

- All Gradio handlers made `async` using `asyncio.to_thread()` — resolves the
  UI freeze/lag caused by blocking HTTP calls on the Gradio event loop
- STT result now stays visible in the transcript area after sending
- Actual transcript text logged (not just char count) for easier debugging

---

### Gradio UI changes

- Voice accordion replaced with a compact `gr.Audio` component that
  **auto-transcribes** via ElevenLabs when recording stops, placing the result
  directly into the question textbox
- Web Speech API (browser mic button) attempted and abandoned — blocked by
  network restrictions (Google server dependency); ElevenLabs confirmed working
- `gr.File` download component added for contract `.docx` output (hidden until
  a contract is generated)
- `allowed_paths=[tempfile.gettempdir()]` added to `demo.launch()` so Gradio
  can serve temp `.docx` files

---

### Logging

- `app.log` file created at project root (UTF-8, appended across restarts)
- Key events logged: OCR start/done/fail, ASR start/done/fail, supervisor errors,
  contract file creation, lawhub fetch operations
- `StreamHandler` also active so all events appear in the terminal in real time

---

### Dependencies added

| Package | Purpose |
|---|---|
| `python-docx` | `.docx` contract file generation |
| `beautifulsoup4` | HTML parsing for lawhub.info scraper |

---

### Files removed / superseded

| Old | Replaced by |
|---|---|
| `main.py` (monolithic 530-line file) | `app/` package + thin `main.py` entry point |

---

## [0.1.0] — 2026-06-28 (initial)

- Single ReAct agent with 3 tools: `legal_search`, `article_search_tool`, `ocr_tool`
- Gradio UI with voice accordion, image upload, chat history
- Hybrid search: dense (Arabic-Triplet-Matryoshka-V2) + BM25 with RRF fusion
- Qdrant collection: `egypt_law_v2` + `articles`
- ElevenLabs STT, Gemini OCR, GPT-4o-mini LLM
