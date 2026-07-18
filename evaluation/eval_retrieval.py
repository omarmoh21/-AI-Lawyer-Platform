import argparse
import csv
import json
import re
import sys
from datetime import datetime
from pathlib import Path

# evaluation/eval_retrieval.py -> backend/ is where the `app` package
# lives (per backend/app/config/settings.py). Adjust this one line if your
# evaluation/ folder sits somewhere else relative to backend/.
BACKEND_ROOT = Path(__file__).resolve().parent.parent / "backend"
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

EVAL_DIR = Path(__file__).resolve().parent

from qdrant_client import models  # noqa: E402

from app.core.models import qdrant_client, dense_model, bm25_model  # noqa: E402
from app.config.settings import COLLECTION_NAME, TOP_K  # noqa: E402


def search_topk(query: str, k: int) -> list[dict]:
    """Same retrieval as hybrid_search, but the final fused result count is
    a parameter instead of the fixed RERANK_TOP_K, so we can sweep K."""
    dense_vector = dense_model.encode(query, normalize_embeddings=True).tolist()
    sparse_vector = list(bm25_model.embed([query]))[0]

    active_filter = models.Filter(
        must=[
            models.FieldCondition(key="cancelled", match=models.MatchValue(value=False))
        ]
    )

    # Prefetch must return at least k candidates per branch (and at least
    # the app's normal TOP_K, so branch-level behavior doesn't drift from
    # what hybrid_search does in production).
    prefetch_limit = max(TOP_K, k)

    results = qdrant_client.query_points(
        collection_name=COLLECTION_NAME,
        prefetch=[
            models.Prefetch(
                query=dense_vector,
                using="dense",
                limit=prefetch_limit,
                filter=active_filter,
            ),
            models.Prefetch(
                query=models.SparseVector(
                    indices=sparse_vector.indices.tolist(),
                    values=sparse_vector.values.tolist(),
                ),
                using="bm25",
                limit=prefetch_limit,
                filter=active_filter,
            ),
        ],
        query=models.FusionQuery(fusion=models.Fusion.RRF),
        limit=k,
    ).points

    return [
        {
            "law_name": r.payload.get("law_name"),
            "article_id": r.payload.get("article_id"),
            "score": round(float(r.score), 4),
        }
        for r in results
    ]


def normalize_article_id(value) -> str:
    """Coerce whatever Qdrant stores (int, '12', '12 مكرر', ...) down to
    digits only, so it's directly comparable to the dataset's article_id."""
    digits = "".join(ch for ch in str(value) if ch.isdigit())
    return digits or str(value).strip()


# Trailing "<law number/year>" suffix that the dataset appends after a
# " - " separator (e.g. "قانون العقوبات - القانون رقم 58 لسنة 1937") but
# that the payload's law_name sometimes omits, or attaches without the
# dash (e.g. "قانون العمل رقم 14 لسنة 2025"). Only strips when it's
# genuinely a trailing suffix, so laws whose *entire* name starts with
# "قانون رقم N لسنة Y ..." (no separate short name) are left untouched.
_LAW_NUMBER_SUFFIX_RE = re.compile(
    r"\s*[-–—]?\s*(?:(?:ال)?قانون\s+)?رقم\s+\d+\s+لسنة\s+\d+.*$"
)

# Hamza-on-alef variants that are routinely typed interchangeably in
# Arabic legal text ("الإجراءات" vs "الاجراءات") but are different
# characters, so a byte-for-byte comparison treats them as unrelated.
_HAMZA_MAP = str.maketrans({"أ": "ا", "إ": "ا", "آ": "ا", "ـ": ""})


def normalize_law_name(name: str) -> str:
    """Collapse dataset-vs-payload law_name formatting differences down
    to a comparable core: strip the trailing law-number suffix, unify
    hamza spelling, unify dash characters, collapse whitespace."""
    if not name:
        return ""
    s = name.strip()
    s = re.sub(r"[–—]", "-", s)
    s = _LAW_NUMBER_SUFFIX_RE.sub("", s)
    s = s.translate(_HAMZA_MAP)
    s = re.sub(r"\s+", " ", s).strip(" -")
    return s


def law_names_match(target: str, candidate: str) -> bool:
    """Compare law names on their normalized core rather than requiring
    byte-for-byte equality — see normalize_law_name() for what that
    strips (law-number suffix, hamza variants, dash/whitespace noise)."""
    if not target or not candidate:
        return False
    if target.strip() == candidate.strip():
        return True
    nt, nc = normalize_law_name(target), normalize_law_name(candidate)
    return bool(nt) and bool(nc) and nt == nc


def render_bar(recall: float, width: int = 30) -> str:
    """Text progress bar for the markdown table, e.g. '██████████░░░░░░░░░░ 52.8%'."""
    filled = round(recall * width)
    return "█" * filled + "░" * (width - filled)


def write_markdown_report(
    md_path: Path,
    dataset_name: str,
    max_k: int,
    total: int,
    summary: dict,
    mrr: float,
    misses: list[dict],
    max_missed_examples: int = 15,
) -> None:
    lines = []
    lines.append("# Retrieval Evaluation Report")
    lines.append("")
    lines.append(f"- **Dataset:** `{dataset_name}`")
    lines.append(f"- **Queries evaluated:** {total}")
    lines.append(f"- **K range:** 1 – {max_k}")
    lines.append(f"- **Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    lines.append("## Recall@K")
    lines.append("")
    lines.append("| K | Hits | Recall@K | |")
    lines.append("|---|------|----------|---|")
    for k in range(1, max_k + 1):
        s = summary[k]
        lines.append(
            f"| {k} | {s['hits']}/{total} | {s['recall']:.2%} | "
            f"`{render_bar(s['recall'])}` |"
        )
    lines.append("")
    lines.append("## Summary")
    lines.append("")
    lines.append(f"- **MRR (within top-{max_k}):** {mrr:.4f}")
    lines.append(
        f"- **Never retrieved within top-{max_k}:** {len(misses)}/{total} "
        f"({len(misses) / total:.1%})"
    )
    best_k = max_k
    lines.append(f"- **Best recall (K={best_k}):** {summary[best_k]['recall']:.2%}")
    lines.append("")

    if misses:
        lines.append("## Sample of missed queries")
        lines.append("")
        lines.append(
            f"First {min(max_missed_examples, len(misses))} of {len(misses)} queries "
            f"whose target article never appeared in the top-{max_k} results:"
        )
        lines.append("")
        lines.append("| # | Query | Law | Article |")
        lines.append("|---|-------|-----|---------|")
        for i, m in enumerate(misses[:max_missed_examples], start=1):
            query = m["query"].replace("|", "\\|")
            law = (m["law_name"] or "").replace("|", "\\|")
            lines.append(f"| {i} | {query} | {law} | {m['article_id']} |")
        lines.append("")

    md_path.write_text("\n".join(lines), encoding="utf-8")


def find_rank(
    target_law: str, target_article: str, retrieved: list[dict]
) -> int | None:
    """1-based rank of the first correct hit, or None if not in the list."""
    for i, r in enumerate(retrieved, start=1):
        if normalize_article_id(r["article_id"]) == target_article and law_names_match(
            target_law, r["law_name"] or ""
        ):
            return i
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument(
        "--dataset", default=str(EVAL_DIR / "legal_rag_eval_dataset_full.csv")
    )
    ap.add_argument("--max-k", type=int, default=7)
    ap.add_argument("--out", default=str(EVAL_DIR / "retrieval_eval_results.json"))
    ap.add_argument("--md-out", default=str(EVAL_DIR / "retrieval_eval_report.md"))
    ap.add_argument(
        "--limit-rows", type=int, default=None, help="Debug: only run the first N rows"
    )
    args = ap.parse_args()

    with open(args.dataset, encoding="utf-8-sig") as f:
        rows = list(csv.DictReader(f))
    if args.limit_rows:
        rows = rows[: args.limit_rows]

    total = len(rows)
    ranks: list[int | None] = []
    per_query_log = []

    for i, row in enumerate(rows, start=1):
        query = row["query"]
        target_article = normalize_article_id(row["article_id"])
        target_law = row["law_name"]

        try:
            retrieved = search_topk(query, args.max_k)
        except Exception as e:
            print(f"[{i}/{total}] search failed: {e}", file=sys.stderr)
            ranks.append(None)
            per_query_log.append(
                {
                    "query": query,
                    "law_name": target_law,
                    "article_id": target_article,
                    "rank": None,
                    "error": str(e),
                }
            )
            continue

        rank = find_rank(target_law, target_article, retrieved)
        ranks.append(rank)
        per_query_log.append(
            {
                "query": query,
                "law_name": target_law,
                "article_id": target_article,
                "rank": rank,
                "retrieved": retrieved,
            }
        )

        if i % 25 == 0:
            print(f"[{i}/{total}] processed", file=sys.stderr)

    print(f"\n=== Recall@K (K = 1..{args.max_k}), n = {total} ===")
    summary = {}
    for k in range(1, args.max_k + 1):
        hits = sum(1 for r in ranks if r is not None and r <= k)
        recall = hits / total
        summary[k] = {"hits": hits, "recall": round(recall, 4)}
        print(f"K={k:>2}  hits={hits:>4}/{total}  recall@{k} = {recall:.4f}")

    # Mean Reciprocal Rank — more informative than any single K, worth
    # tracking alongside the sweep since it summarizes rank quality, not
    # just whether the target made the cutoff.
    mrr = sum((1 / r) for r in ranks if r is not None) / total
    print(f"\nMRR (within top-{args.max_k}) = {mrr:.4f}")

    misses = [q for q in per_query_log if q["rank"] is None]
    print(
        f"Never retrieved within top-{args.max_k}: {len(misses)}/{total} ({len(misses) / total:.1%})"
    )

    Path(args.out).write_text(
        json.dumps(
            {"summary": summary, "mrr": round(mrr, 4), "per_query": per_query_log},
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"\nFull per-query log written to {args.out}")

    write_markdown_report(
        md_path=Path(args.md_out),
        dataset_name=Path(args.dataset).name,
        max_k=args.max_k,
        total=total,
        summary=summary,
        mrr=mrr,
        misses=misses,
    )
    print(f"Markdown report written to {args.md_out}")


if __name__ == "__main__":
    main()
