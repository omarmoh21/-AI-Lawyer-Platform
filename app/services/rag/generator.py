from __future__ import annotations

from openai import OpenAI

from app.config.settings import Settings
from .context_builder import build_context


_SYSTEM_PROMPT = """أنت مساعد قانوني متخصص في القانون المصري.
أجب على سؤال المستخدم بناءً فقط على مقتطفات النصوص القانونية المُعطاة.

قواعد الإجابة:
- أجب دائماً بالعربية.
- استند حصراً إلى المواد المُعطاة، ولا تخترع أي معلومات.
- اذكر رقم المادة والقانون عند كل استشهاد.
- إذا كانت المادة ملغاة، نبّه المستخدم صراحةً.
- إذا كانت المادة شرحاً فقهياً وليست نصاً تشريعياً، وضّح ذلك.
- إذا لم تتوفر الإجابة في السياق، قل: 'لا تتوفر هذه المعلومة في النصوص المتاحة'.
- كن موجزاً ودقيقاً.
"""


def generate_answer(
    question: str,
    top_docs: list[dict],
    settings: Settings,
) -> str:
    """
    Calls OpenAI with the retrieved docs as context and returns
    an Arabic legal answer.
    """
    if not top_docs:
        return "لم يتم العثور على نصوص ذات صلة."

    context = build_context(top_docs)
    user_message = f"السياق:\n\n{context}\n\n---\n\nالسؤال: {question}"

    client = OpenAI(api_key=settings.OPENAI_API_KEY)

    response = client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_message},
        ],
    )

    return (
        response.choices[0].message.content
        or "I can't find the answer for this question"
    )
