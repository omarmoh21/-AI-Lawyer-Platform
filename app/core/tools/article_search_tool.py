from langchain_core.tools import tool

from core.services.rag.qdrant_search import article_search


@tool
def article_search_tool(law_name: str, article_number: int) -> str:
    """
    ابحث عن مادة قانونية بعينها برقمها واسم القانون.
    استخدم هذه الأداة فقط عندما يذكر المستخدم رقم مادة محدد واسم القانون.
    """
    result = article_search(law_name, article_number)
    if not result:
        return "لم يتم العثور على هذه المادة في قاعدة البيانات."
    return (
        f"القانون: {result.get('law_name')}\n"
        f"المادة: {result.get('article_name')}\n"
        f"النص:\n{result.get('text')}"
    )
