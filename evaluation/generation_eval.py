"""
Evaluate generation quality (faithfulness, answer relevancy, context
precision, context recall) for the 100-question dataset using RAGAS,
with Gemini as the judge LLM via the app's existing make_llm() factory.

Usage:
    python evaluation/generation_eval.py --dataset generation_eval_dataset_100.csv
"""

import argparse
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

# evaluation/generation_eval.py -> backend/ is where the `app` package
# lives (per D:\AI Lawyer\backend\app\config\settings.py). Adjust this
# one line if your evaluation/ folder sits somewhere else relative to
# backend/.
BACKEND_ROOT = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

EVAL_DIR = Path(__file__).resolve().parent

from app.config.settings import GEMINI_API_KEY, make_llm  # noqa: E402
from app.services.rag.qdrant_search import hybrid_search  # noqa: E402

# ragas 0.3.x eagerly imports ChatVertexAI from `langchain_community.
# chat_models.vertexai`, a module path that langchain-community 0.4+ removed
# (Vertex chat models live in langchain-google-vertexai now). This eval judges
# with Gemini via make_llm() and never touches Vertex, so we register a stub
# module that satisfies ragas's import without pinning older langchain. If the
# real module is ever importable, we use it instead and this no-ops.
import types  # noqa: E402

try:
    import langchain_community.chat_models.vertexai  # noqa: F401
except ModuleNotFoundError:
    _vertexai_stub = types.ModuleType("langchain_community.chat_models.vertexai")

    class ChatVertexAI:  # placeholder — never instantiated in this eval
        ...

    _vertexai_stub.ChatVertexAI = ChatVertexAI
    sys.modules["langchain_community.chat_models.vertexai"] = _vertexai_stub

from ragas import SingleTurnSample, EvaluationDataset, evaluate  # noqa: E402
from ragas.llms import LangchainLLMWrapper  # noqa: E402
from ragas.embeddings import LangchainEmbeddingsWrapper  # noqa: E402
from ragas.metrics import (  # noqa: E402
    Faithfulness,
    ResponseRelevancy,
    LLMContextPrecisionWithReference,
    LLMContextRecall,
)
from ragas.run_config import RunConfig  # noqa: E402
from langchain_google_genai import GoogleGenerativeAIEmbeddings  # noqa: E402


# ---------------------------------------------------------------------------
# Answer generation — THIS IS A STUB. Replace with your real generation call
# (e.g. your LangGraph agent's invoke, or however the app actually turns
# retrieved chunks + a question into a final answer).
# ---------------------------------------------------------------------------
def _content_to_text(content) -> str:
    """langchain 1.x returns AIMessage.content as either a plain string or a
    list of content blocks (e.g. [{'type': 'text', 'text': ...}]). RAGAS's
    SingleTurnSample.response requires a str, so flatten blocks to their text."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, dict):
                parts.append(block.get("text", ""))
            else:
                parts.append(str(block))
        return "".join(parts)
    return str(content)


def generate_answer(question: str, contexts: list[str]) -> str:
    llm = make_llm(temperature=0.1)
    context_block = "\n\n".join(f"- {c}" for c in contexts) or "لا يوجد سياق مسترجع."
    prompt = (
        "أجب عن السؤال القانوني التالي بالاعتماد فقط على السياق المرفق، "
        "وبإيجاز ودقة، دون إضافة معلومات غير واردة فيه.\n\n"
        f"السياق:\n{context_block}\n\n"
        f"السؤال: {question}\n\nالإجابة:"
    )
    return _content_to_text(llm.invoke(prompt).content)


def build_sample(row: pd.Series) -> SingleTurnSample:
    results = hybrid_search(row["question"])
    contexts = [r["text"] for r in results if r.get("text")]
    response = generate_answer(row["question"], contexts)
    return SingleTurnSample(
        user_input=row["question"],
        retrieved_contexts=contexts,
        response=response,
        reference=row["ground_truth_answer"],
    )


# ---------------------------------------------------------------------------
# Markdown report
# ---------------------------------------------------------------------------
def render_bar(score: float, width: int = 30) -> str:
    score = max(0.0, min(1.0, score))
    filled = round(score * width)
    return "█" * filled + "░" * (width - filled)


def write_markdown_report(
    md_path: Path, dataset_name: str, results_df: pd.DataFrame, metric_cols: list[str]
) -> None:
    lines = []
    lines.append("# Generation Evaluation Report (RAGAS)")
    lines.append("")
    lines.append(f"- **Dataset:** `{dataset_name}`")
    lines.append(f"- **Questions evaluated:** {len(results_df)}")
    lines.append("- **Judge model:** Gemini (via `make_llm()`)")
    lines.append(f"- **Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append("## Mean scores")
    lines.append("")
    lines.append("| Metric | Mean | |")
    lines.append("|---|---|---|")
    for col in metric_cols:
        mean = results_df[col].mean()
        lines.append(f"| {col} | {mean:.2%} | `{render_bar(mean)}` |")
    lines.append("")

    lines.append("## Lowest-scoring questions (by faithfulness)")
    lines.append("")
    if "faithfulness" in results_df.columns:
        worst = results_df.sort_values("faithfulness").head(15)
        header = "| # | Question | Law | Article | " + " | ".join(metric_cols) + " |"
        sep = "|---|---|---|---|" + "---|" * len(metric_cols)
        lines.append(header)
        lines.append(sep)
        for i, (_, row) in enumerate(worst.iterrows(), start=1):
            q = str(row.get("user_input", "")).replace("|", "\\|")
            law = str(row.get("law_name", "")).replace("|", "\\|")
            art = row.get("article_id", "")
            scores = " | ".join(f"{row[c]:.2f}" for c in metric_cols)
            lines.append(f"| {i} | {q} | {law} | {art} | {scores} |")
    lines.append("")

    md_path.write_text("\n".join(lines), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--dataset", default=str(EVAL_DIR / "generation_eval_dataset_100.csv")
    )
    ap.add_argument("--out", default=str(EVAL_DIR / "generation_eval_results.csv"))
    ap.add_argument("--md-out", default=str(EVAL_DIR / "generation_eval_report.md"))
    ap.add_argument(
        "--limit-rows", type=int, default=None, help="Debug: only run the first N rows"
    )
    ap.add_argument(
        "--max-workers",
        type=int,
        default=4,
        help="RAGAS judge concurrency (lower this if you hit Gemini rate limits)",
    )
    ap.add_argument(
        "--timeout",
        type=int,
        default=600,
        help="Per-request timeout (s) for RAGAS judge calls; Gemini can be slow, so this is well above RAGAS's 180s default",
    )
    ap.add_argument(
        "--max-retries",
        type=int,
        default=3,
        help="RAGAS retries per judge call on timeout/transient error",
    )
    args = ap.parse_args()

    df = pd.read_csv(args.dataset, encoding="utf-8-sig")
    if args.limit_rows:
        df = df.head(args.limit_rows)
    print(f"Loaded {len(df)} questions from {args.dataset}", file=sys.stderr)

    print(
        "Building samples (retrieval + generation for each question)...",
        file=sys.stderr,
    )
    samples = []
    for i, (_, row) in enumerate(df.iterrows(), start=1):
        samples.append(build_sample(row))
        if i % 10 == 0:
            print(f"  [{i}/{len(df)}] built", file=sys.stderr)
    eval_dataset = EvaluationDataset(samples=samples)

    evaluator_llm = LangchainLLMWrapper(make_llm(temperature=0))
    evaluator_embeddings = LangchainEmbeddingsWrapper(
        GoogleGenerativeAIEmbeddings(
            model="models/text-embedding-004", google_api_key=GEMINI_API_KEY
        )
    )

    metrics = [
        Faithfulness(),
        ResponseRelevancy(),
        LLMContextPrecisionWithReference(),
        LLMContextRecall(),
    ]
    metric_names = [
        "faithfulness",
        "answer_relevancy",
        "llm_context_precision_with_reference",
        "llm_context_recall",
    ]

    print("Running RAGAS evaluation...", file=sys.stderr)
    result = evaluate(
        dataset=eval_dataset,
        metrics=metrics,
        llm=evaluator_llm,
        embeddings=evaluator_embeddings,
        run_config=RunConfig(
            max_workers=args.max_workers,
            timeout=args.timeout,
            max_retries=args.max_retries,
        ),
    )

    results_df = result.to_pandas()
    results_df["law_name"] = df["law_name"].values
    results_df["article_id"] = df["article_id"].values

    results_df.to_csv(args.out, index=False, encoding="utf-8-sig")
    print(f"\nPer-question results written to {args.out}")

    metric_cols = [c for c in metric_names if c in results_df.columns]
    print("\n=== Mean scores ===")
    for col in metric_cols:
        print(f"{col:45s} {results_df[col].mean():.4f}")

    write_markdown_report(
        Path(args.md_out), Path(args.dataset).name, results_df, metric_cols
    )
    print(f"\nMarkdown report written to {args.md_out}")


if __name__ == "__main__":
    main()
