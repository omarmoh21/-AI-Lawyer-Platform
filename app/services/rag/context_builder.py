# app/services/rag/context_builder.py


def build_context(top_docs: list[dict]) -> str:
    parts: list[str] = []

    for doc in top_docs:
        header = f"[{doc['law_name']} — المادة {doc['article_id']}"

        if doc["cancelled"]:
            header += " — ملغاة"
        if doc["is_commentary"]:
            header += " — شرح فقهي"

        header += "]"
        parts.append(f"{header}\n{doc['text']}")

    return "\n\n---\n\n".join(parts)
