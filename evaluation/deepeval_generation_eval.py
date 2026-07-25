"""
DeepEval-based generation evaluation for the hybrid_search (dense + BM25 RRF)
pipeline — deliberately NOT the full legal_research_agent. Metrics: answer
relevancy, faithfulness, hallucination, and groundedness (reported as the
same score as faithfulness, per team decision).

Judge model: Gemini, via the app's existing make_llm() factory, wrapped to
satisfy DeepEval's custom-model interface (DeepEval defaults to OpenAI
otherwise, and this project has no OpenAI key anywhere).

IMPORTANT: this evaluates pure RRF fusion, not Cohere-reranked results. Set
RERANK_ENABLED=false in backend/.env before running, or this script will warn
and refuse to proceed.

Resilience design (for long runs, e.g. 40 questions ≈ 90 minutes):
  - Questions are sampled WITHOUT replacement up front, and the exact sample
    is written to manifest.json before any evaluation starts.
  - Each question's result (or error) is written to its own JSON file
    immediately after it's scored — a crash partway through only costs the
    remaining questions, not the ones already done.
  - A single question's failure is logged and skipped; it does not abort
    the run.
  - The aggregate CSV/markdown report is written at the end from whatever
    succeeded, and can also be rebuilt later from an existing run directory
    without re-running anything (--rebuild-report).

Usage:
    # Fresh run: sample N questions (no replacement), evaluate, write
    # per-question files incrementally + a final aggregate report.
    python evaluation/deepeval_generation_eval.py --n 40 --seed 42

    # Rebuild the aggregate report from an existing (possibly partial) run
    # directory, without re-running anything:
    python evaluation/deepeval_generation_eval.py --rebuild-report evaluation/deepeval_runs/20260724_120000
"""

import argparse
import asyncio
import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

# evaluation/ -> backend/ is where the `app` package lives.
BACKEND_ROOT = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

EVAL_DIR = Path(__file__).resolve().parent
RUNS_DIR = EVAL_DIR / "deepeval_runs"

METRIC_COLS = ["answer_relevancy", "faithfulness", "groundedness", "hallucination"]


# ---------------------------------------------------------------------------
# Gemini judge — wraps the app's own make_llm() to satisfy DeepEval's
# DeepEvalBaseLLM interface (generate/a_generate/get_model_name/load_model),
# since DeepEval calls OpenAI by default and this project has no OpenAI key.
# ---------------------------------------------------------------------------
def _content_to_text(content) -> str:
    """langchain 1.x AIMessage.content can be a str or a list of content
    blocks; DeepEval needs a plain str back from generate()/a_generate()."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(
            b.get("text", "") if isinstance(b, dict) else str(b) for b in content
        )
    return str(content)


def _build_judge_and_metrics():
    from deepeval.models import DeepEvalBaseLLM
    from deepeval.metrics import (
        AnswerRelevancyMetric,
        FaithfulnessMetric,
        HallucinationMetric,
    )
    from app.config.settings import make_llm

    class GeminiDeepEvalModel(DeepEvalBaseLLM):
        def __init__(self):
            self._model = make_llm(temperature=0)

        def load_model(self):
            return self._model

        def generate(self, prompt: str) -> str:
            return _content_to_text(self.load_model().invoke(prompt).content)

        async def a_generate(self, prompt: str) -> str:
            result = await self.load_model().ainvoke(prompt)
            return _content_to_text(result.content)

        def get_model_name(self) -> str:
            return "Gemini (via make_llm)"

    judge = GeminiDeepEvalModel()
    return judge, {
        "answer_relevancy": AnswerRelevancyMetric(model=judge),
        "faithfulness": FaithfulnessMetric(model=judge),
        "hallucination": HallucinationMetric(model=judge),
    }


# ---------------------------------------------------------------------------
# Answer generation over hybrid_search's retrieved context (RRF, no rerank).
# ---------------------------------------------------------------------------
async def generate_answer(question: str, contexts: list[str]) -> str:
    from app.config.settings import make_llm

    llm = make_llm(temperature=0.1)
    context_block = "\n\n".join(f"- {c}" for c in contexts) or "لا يوجد سياق مسترجع."
    prompt = (
        "أجب عن السؤال القانوني التالي بالاعتماد فقط على السياق المرفق، "
        "وبإيجاز ودقة، دون إضافة معلومات غير واردة فيه.\n\n"
        f"السياق:\n{context_block}\n\n"
        f"السؤال: {question}\n\nالإجابة:"
    )
    response = await llm.ainvoke(prompt)
    return _content_to_text(response.content)


async def evaluate_one(row: pd.Series, metrics: dict) -> dict:
    from deepeval.test_case import LLMTestCase
    from app.services.rag.qdrant_search import hybrid_search

    results = await hybrid_search(row["question"])
    contexts = [r["text"] for r in results if r.get("text")]
    answer = await generate_answer(row["question"], contexts)

    test_case = LLMTestCase(
        input=row["question"],
        actual_output=answer,
        retrieval_context=contexts,
        context=contexts,  # HallucinationMetric's "context" — same retrieved
        # passages, since that's our only source of truth
        expected_output=row["ground_truth_answer"],
    )

    scores, reasons = {}, {}
    for name, metric in metrics.items():
        metric.measure(test_case)
        scores[name] = metric.score
        reasons[name] = getattr(metric, "reason", None)
    scores["groundedness"] = scores["faithfulness"]  # same metric, per team decision
    reasons["groundedness"] = reasons["faithfulness"]

    return {
        "question": row["question"],
        "ground_truth_answer": row["ground_truth_answer"],
        "law_name": row.get("law_name"),
        "article_id": row.get("article_id"),
        "answer": answer,
        "n_contexts": len(contexts),
        "contexts": contexts,
        "scores": scores,
        "reasons": reasons,
        "failed": False,
    }


# ---------------------------------------------------------------------------
# Sampling + manifest
# ---------------------------------------------------------------------------
def sample_questions(dataset_path: Path, n: int, seed: int) -> pd.DataFrame:
    df = pd.read_csv(dataset_path, encoding="utf-8-sig")
    n = min(n, len(df))
    return df.sample(n=n, replace=False, random_state=seed).reset_index(drop=True)


def write_manifest(
    run_dir: Path, dataset_path: Path, sample: pd.DataFrame, seed: int
) -> None:
    manifest = {
        "dataset": dataset_path.name,
        "seed": seed,
        "n": len(sample),
        "created": datetime.now().isoformat(),
        "questions": sample["question"].tolist(),
    }
    (run_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )


# ---------------------------------------------------------------------------
# Report (built from per-question JSON files — used both at end-of-run and
# by --rebuild-report, so a partial run can always produce a report later).
# ---------------------------------------------------------------------------
def render_bar(score: float, width: int = 20) -> str:
    score = max(0.0, min(1.0, score))
    filled = round(score * width)
    return "█" * filled + "░" * (width - filled)


def load_question_files(run_dir: Path) -> list[dict]:
    files = sorted(run_dir.glob("question_*.json"))
    return [json.loads(f.read_text(encoding="utf-8")) for f in files]


def build_report(run_dir: Path) -> None:
    records = load_question_files(run_dir)
    ok = [r for r in records if not r.get("failed")]
    failed = [r for r in records if r.get("failed")]

    manifest_path = run_dir / "manifest.json"
    manifest = (
        json.loads(manifest_path.read_text(encoding="utf-8"))
        if manifest_path.exists()
        else {}
    )

    # --- CSV ---
    rows = []
    for i, r in enumerate(records, start=1):
        row = {"#": i, "question": r["question"], "failed": r.get("failed", False)}
        if not r.get("failed"):
            row.update(r["scores"])
        rows.append(row)
    csv_path = run_dir / "report.csv"
    pd.DataFrame(rows).to_csv(csv_path, index=False, encoding="utf-8-sig")

    # --- Markdown ---
    lines = [
        "# DeepEval Generation Report (hybrid_search — pure RRF, no rerank)",
        "",
        f"- **Dataset:** `{manifest.get('dataset', '?')}`",
        f"- **Sample seed:** {manifest.get('seed', '?')}",
        f"- **Questions sampled:** {manifest.get('n', len(records))}",
        f"- **Completed successfully:** {len(ok)}",
        f"- **Failed/skipped:** {len(failed)}",
        "- **Judge model:** Gemini (via `make_llm()`)",
        "- **Pipeline under test:** `hybrid_search()` + simple context-grounded "
        "generation — NOT the full `legal_research_agent`",
        f"- **Report generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "",
    ]

    if ok:
        lines += [
            "## Mean scores (over successful questions only)",
            "",
            "| Metric | Mean | |",
            "|---|---|---|",
        ]
        for col in METRIC_COLS:
            mean = sum(r["scores"][col] for r in ok) / len(ok)
            lines.append(f"| {col} | {mean:.2%} | `{render_bar(mean)}` |")
        lines.append("")

    if failed:
        lines += [
            "## Failed/skipped questions",
            "",
            "| # | Question | Error |",
            "|---|---|---|",
        ]
        for i, r in enumerate(records, start=1):
            if r.get("failed"):
                q = str(r["question"]).replace("|", "\\|")
                err = str(r.get("error", "")).replace("|", "\\|")[:200]
                lines.append(f"| {i} | {q} | {err} |")
        lines.append("")

    if ok:
        lines += [
            "## Per-question results",
            "",
            "| # | Question | " + " | ".join(METRIC_COLS) + " |",
            "|---|---|" + "---|" * len(METRIC_COLS),
        ]
        for i, r in enumerate(records, start=1):
            if r.get("failed"):
                continue
            q = str(r["question"]).replace("|", "\\|")
            scores = " | ".join(f"{r['scores'][c]:.2f}" for c in METRIC_COLS)
            lines.append(f"| {i} | {q} | {scores} |")
        lines.append("")

    md_path = run_dir / "report.md"
    md_path.write_text("\n".join(lines), encoding="utf-8")

    print(f"\nReport written to {csv_path} and {md_path}")
    print(f"({len(ok)} succeeded, {len(failed)} failed, of {len(records)} total)")


# ---------------------------------------------------------------------------
async def run_eval(args):
    from app.config.settings import RERANK_ENABLED

    if RERANK_ENABLED:
        print(
            "ERROR: RERANK_ENABLED=true in backend/.env — hybrid_search() would "
            "return Cohere-reranked results, not pure RRF. Set RERANK_ENABLED=false "
            "and restart before running this eval.",
            file=sys.stderr,
        )
        sys.exit(1)

    dataset_path = EVAL_DIR / args.dataset
    sample = sample_questions(dataset_path, args.n, args.seed)

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = RUNS_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    write_manifest(run_dir, dataset_path, sample, args.seed)
    print(f"Run directory: {run_dir}", file=sys.stderr)
    print(
        f"Sampled {len(sample)} questions (seed={args.seed}, no replacement)",
        file=sys.stderr,
    )

    judge, metrics = _build_judge_and_metrics()

    for i, (_, row) in enumerate(sample.iterrows(), start=1):
        q_file = run_dir / f"question_{i:02d}.json"
        print(f"[{i}/{len(sample)}] {row['question'][:60]}...", file=sys.stderr)
        try:
            result = await evaluate_one(row, metrics)
        except Exception as e:  # one bad question must never abort the whole run
            print(f"  FAILED: {type(e).__name__}: {e}", file=sys.stderr)
            result = {
                "question": row["question"],
                "failed": True,
                "error": f"{type(e).__name__}: {e}",
            }
        q_file.write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
        )

    build_report(run_dir)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", default="generation_eval_dataset_100.csv")
    ap.add_argument("--n", type=int, default=4, help="How many questions to sample")
    ap.add_argument(
        "--seed", type=int, default=42, help="Random sample seed (no replacement)"
    )
    ap.add_argument(
        "--rebuild-report",
        metavar="RUN_DIR",
        help="Rebuild report.csv/report.md from an existing run directory's "
        "question_*.json files, without evaluating anything",
    )
    args = ap.parse_args()

    if args.rebuild_report:
        build_report(Path(args.rebuild_report))
        return

    asyncio.run(run_eval(args))


if __name__ == "__main__":
    main()
