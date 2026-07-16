from langchain_core.tools import tool

from core.services.rag.qdrant_search import hybrid_search


@tool
def legal_search(query: str) -> str:
    """ابحث في قاعدة بيانات القوانين المصرية عن المواد والتشريعات المتعلقة بالسؤال."""
    results = hybrid_search(query)
    if not results:
        return "لم يتم العثور على نتائج ذات صلة في قاعدة البيانات."

    formatted = []
    for i, r in enumerate(results, 1):
        formatted.append(
            f"[مصدر {i}]\n"
            f"القانون: {r['law_name']}\n"
            f"المادة: {r['article_id']}\n"
            f"التصنيف: {r['category']}\n"
            f"النص: {r['text']}\n"
            f"درجة التطابق: {r['score']}"
        )
    return ("\n" + "─" * 40 + "\n").join(formatted)
