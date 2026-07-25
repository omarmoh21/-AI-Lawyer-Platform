# DeepEval Generation Report (hybrid_search — pure RRF, no rerank)

- **Dataset:** `generation_eval_dataset_100.csv`
- **Questions evaluated:** 4
- **Judge model:** Gemini (via `make_llm()`)
- **Pipeline under test:** `hybrid_search()` + simple context-grounded generation — NOT the full `legal_research_agent`
- **Generated:** 2026-07-24 12:48:37

## Mean scores

| Metric | Mean | |
|---|---|---|
| answer_relevancy | 100.00% | `████████████████████` |
| faithfulness | 75.00% | `███████████████░░░░░` |
| groundedness | 75.00% | `███████████████░░░░░` |
| hallucination | 0.00% | `░░░░░░░░░░░░░░░░░░░░` |

## Per-question results

| # | Question | answer_relevancy | faithfulness | groundedness | hallucination |
|---|---|---|---|---|---|
| 1 | إذا تضمن قانون آخر أحكامًا إجرائية خاصة تختلف عن القواعد العامة للإجراءات الجنائية، فهل يظل هذا النص الخاص نافذًا أم يُستبعد لصالح القانون الجديد؟ | 1.00 | 1.00 | 1.00 | 0.00 |
| 2 | من الذي يجب أن يتولى تفتيش شخص المتهمة إذا كانت أنثى في حالة يجوز فيها قانونًا القبض عليها؟ | 1.00 | 1.00 | 1.00 | 0.00 |
| 3 | ما الإجراء الذي يجب على المحقق اتخاذه إذا حضر المتهم للاستجواب دون محامٍ ولم يحضر محاميه رغم دعوته؟ | 1.00 | 1.00 | 1.00 | 0.00 |
| 4 | عند ضم جرائم مرتبطة تدخل في اختصاص محاكم من درجات مختلفة، إلى أي محكمة تُحال الدعوى بأمر إحالة واحد؟ | 1.00 | 0.00 | 0.00 | 0.00 |
