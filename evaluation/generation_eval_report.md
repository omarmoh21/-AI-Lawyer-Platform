# Generation Evaluation Report (RAGAS)

- **Dataset:** `generation_eval_dataset_100.csv`
- **Questions evaluated:** 2
- **Judge model:** Gemini (via `make_llm()`)
- **Generated:** 2026-07-18 17:39:49

## Mean scores

| Metric | Mean | |
|---|---|---|
| faithfulness | 100.00% | `██████████████████████████████` |
| answer_relevancy | nan% | `██████████████████████████████` |
| llm_context_precision_with_reference | 75.00% | `██████████████████████░░░░░░░░` |

## Lowest-scoring questions (by faithfulness)

| # | Question | Law | Article | faithfulness | answer_relevancy | llm_context_precision_with_reference |
|---|---|---|---|---|---|---|
| 1 | إذا تضمن قانون آخر أحكامًا إجرائية خاصة تختلف عن القواعد العامة للإجراءات الجنائية، فهل يظل هذا النص الخاص نافذًا أم يُستبعد لصالح القانون الجديد؟ | قانون الإجراءات الجنائية - قانون رقم 174 لسنة 2025 | 1 | 1.00 | nan | 0.50 |
| 2 | من الذي يجب أن يتولى تفتيش شخص المتهمة إذا كانت أنثى في حالة يجوز فيها قانونًا القبض عليها؟ | قانون الإجراءات الجنائية - قانون رقم 174 لسنة 2025 | 49 | 1.00 | nan | 1.00 |
