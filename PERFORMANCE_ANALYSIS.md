# Performance Analysis — Async Migration & Concurrency Testing

This document records the architecture changes made to improve throughput under
concurrent load, and the empirical test results that validate (and correct) the
reasoning behind them.

## 1. Background: what changed and why

### 1.1 Embedding: in-process `SentenceTransformer` → TEI (Text Embeddings Inference)

The backend previously loaded the dense embedding model (`sentence-transformers`,
`torch`) directly in the FastAPI process. This had two costs:

- **Slow startup** — loading the model added ~60–90s to every backend restart.
- **Heavy dependencies** — `torch` + `sentence-transformers` are large and CPU-only
  inference competes with the rest of the app for the same process's resources.

Dense embeddings are now served by a separate **TEI** container (Rust-based,
`ghcr.io/huggingface/text-embeddings-inference:cpu-latest`), reached over HTTP. The
backend no longer imports `torch`/`sentence-transformers` for this path — startup
dropped from ~60–90s to a few seconds.

### 1.2 Sync → async migration ("Tier 1")

**The problem.** FastAPI route handlers defined as plain `def` are automatically run
in a threadpool (capacity ~40 by default), which keeps the event loop free — but the
calling thread is held for the *entire* duration of the request, including time spent
waiting on external services (Gemini, Qdrant, Cohere, TEI). Under concurrent load,
this threadpool is a hard ceiling: once ~40 requests are in flight, the 41st queues
behind whichever slow LLM call finishes first, even though the CPU is mostly idle
during those waits.

**The fix.** The full I/O chain was converted to native `async`/`await`:

| Layer | Change |
|---|---|
| Qdrant | `QdrantClient` → `AsyncQdrantClient` |
| TEI embedding calls | `requests` → `httpx.AsyncClient` |
| Cohere reranking | `cohere.Client` → `cohere.AsyncClient` |
| Lawhub contract scraper | `requests` → `httpx.AsyncClient` |
| ElevenLabs ASR | `requests` → `httpx.AsyncClient` |
| LangGraph agents (`supervisor`, sub-agents) | `.invoke()` → `.ainvoke()` |
| BM25 sparse embedding (`fastembed`) | genuinely CPU-bound, no async equivalent exists — offloaded via `asyncio.to_thread` so it doesn't block the event loop |
| PyMuPDF PDF parsing (`fitz`) | same reasoning — CPU-bound, offloaded via `asyncio.to_thread` in the `/documents/*` routes |
| All routes touching the above | `def` → `async def` |

**Two real bugs were caught and fixed during this migration:**

1. **`/documents/extract` and `/transcribe`** were already declared `async def` but
   called blocking synchronous code directly inside them (`ocr_graph.invoke()`, a sync
   `requests` call) — the worst-case version of the threadpool problem, since these
   are the *slowest* calls in the app (vision OCR, audio upload) and would freeze the
   **entire server** for every other user while running.
2. **A shared mutable global** (`_recent_history` in `supervisor.py`) was used to pass
   conversation context into sub-agent tool calls. Under true async concurrency, one
   user's request can be paused (awaiting Gemini) while another user's request runs
   and overwrites this shared state — causing conversation history to leak or scramble
   between unrelated users' sessions. Fixed with `contextvars.ContextVar`, which gives
   each concurrent request its own isolated value automatically.

## 2. Concurrency test methodology

Each test signs up N independent users (separate sessions/cookies, simulating N real
browser sessions), sends each one a distinct Arabic legal question, and measures:

- **Sequential total** — N requests, one fully completed before the next starts.
- **Concurrent total** — N requests fired at the same instant; wall-clock time until
  all N responses return.
- **Speedup** = sequential total / concurrent total. Perfect scaling = N×.

## 3. Results

### 3.1 N=5, Cohere reranking **enabled**

| Metric | Value |
|---|---|
| Sequential total | 37.1s |
| Concurrent total | 9.8s |
| Speedup | **3.77×** (of a possible 5×) — 75.4% efficiency |
| Success rate | 5/5 |

**Log evidence:** of the 5 concurrent requests, only **1** received a genuine Cohere
rerank call — the other 4 landed inside the reranker's 6.5s minimum-interval throttle
(built in specifically because the Cohere trial key allows ~10 requests/min) and
transparently fell back to plain RRF ordering, exactly as designed. This is a real,
directly-observed concurrency ceiling — not a failure, but a deliberate
quality/availability tradeoff under load.

### 3.2 N=15, Cohere reranking **disabled** (pure RRF, isolates the hardware-bound path)

| Metric | Value |
|---|---|
| Sequential total | 110.2s |
| Concurrent total | 10.7s |
| Speedup | **10.28×** (of a possible 15×) — 68.5% efficiency |
| Success rate | 15/15, zero errors, zero timeouts |

**Log evidence:** all 15 requests' embedding + Qdrant retrieval calls completed within
a **~4 second burst window**, not serialized one after another — TEI's internal
request batching is handling real concurrent load better than a naive
"single-threaded CPU worker" model would predict. The remaining ~6-7s of the 10.7s
total was consumed by 15 concurrent Gemini LLM generation calls finishing.

## 4. Bottleneck analysis

| Bottleneck | Nature | Evidence |
|---|---|---|
| **Cohere trial rate limit** (10 req/min) | Hard external ceiling, gracefully degraded | 4/5 concurrent requests throttled to RRF fallback (§3.1) |
| **TEI (CPU-only, no GPU)** | Real but partially mitigated by internal batching | 15 embeds completed in a ~4s burst, not 15× serial (§3.2) — better than initially assumed |
| **BM25 sparse embedding** (`fastembed`) | Genuinely CPU-bound Python-side work | Offloaded via `asyncio.to_thread`; still competes for physical CPU cores under load |
| **Gemini API concurrency/rate limits** | External, unverified | Contributes to the ~6-7s generation-phase tail at N=15; not independently isolated in this test |
| **Single uvicorn worker process** | No multi-core parallelism beyond thread-offloaded CPU work | Not tested directly; `--workers N` would add real parallelism at the cost of `--reload` |
| **SQLite** | Single-file, sync SQLAlchemy | Not a measured factor at this scale (reads/writes are local-disk and fast relative to network calls) |

## 5. Key findings

1. **The async migration delivers a real, measured improvement** — not cosmetic.
   15 users got all their answers in 10.7s instead of 110.2s (a wait they would
   otherwise have queued through one at a time).
2. **Zero failures at either concurrency level tested (N=5, N=15)** — the system
   degrades gracefully (slower per-request latency, or reduced rerank quality) rather
   than erroring out or crashing under load.
3. **Efficiency degrades gradually, not catastrophically**, as load triples (75.4% →
   68.5%) — there is real headroom above 15 concurrent users before this specific
   deployment would be expected to struggle.
4. **The sharper ceiling in practice is Cohere's trial-tier rate limit, not raw
   compute** — once reranking is enabled, it throttles far more aggressively (80% of
   concurrent requests degraded at just N=5) than the CPU-bound embedding path does
   even at N=15.

## 6. Recommendations for further scaling

- **If reranking quality under load matters:** upgrade off the Cohere trial tier
  (10 req/min → 1,000 req/min on a production key) — this is the single highest-impact
  change available without touching infrastructure.
- **If raw throughput needs to go further:** a GPU-backed TEI container would remove
  the CPU ceiling on embedding; alternatively, running multiple `uvicorn --workers`
  processes would add true multi-core parallelism (requires dropping `--reload` for
  that deployment).
- **Async DB (SQLAlchemy + `aiosqlite`/`asyncpg`)** was deliberately deprioritized —
  local SQLite reads/writes are fast relative to the network calls that dominate
  request time, so this would add complexity for limited measured benefit at current
  scale. Revisit if moving to Postgres under real concurrent write load.

## 7. Known cleanup opportunities (not yet done)

- `backend/requirements.txt` still lists `torch` and `sentence-transformers`, which
  are no longer used now that dense embeddings are served by TEI — these are safe to
  remove but were left in place as out-of-scope for this round of work.
