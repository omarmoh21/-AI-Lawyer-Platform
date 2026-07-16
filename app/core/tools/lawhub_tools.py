import logging
from typing import Annotated
from langchain_core.tools import tool

from core.services.scraping.lawhub_scraper import (
    list_categories, list_contracts, search_contracts, fetch_contract_text,
)

logger = logging.getLogger(__name__)


@tool
def search_lawhub_contracts(
    query: Annotated[str, "وصف العقد المطلوب بالعربية، مثال: صيانة كمبيوتر، عقد وكالة تجارية، اتفاقية شراكة"],
) -> str:
    """
    ابحث عن عقد بعينه على الموسوعة القانونية (lawhub.info) باستخدام وصف حر.
    استخدم هذه الأداة أولاً دائماً عند الحاجة لعقد غير متوفر في القوالب المحلية الأربعة —
    هذا البحث أدق من تصفح الفئات لأنه يطابق العنوان الفعلي للعقد.
    """
    results = search_contracts(query)
    if not results:
        return f"لم يتم العثور على عقد مطابق لـ '{query}'. جرّب list_lawhub_categories وsearch_lawhub_by_category."

    lines = [f"نتائج البحث عن '{query}':\n"]
    for r in results[:15]:
        lines.append(f"▸ {r['title']} — post_id: {r['post_id']}")
    return "\n".join(lines)


@tool
def list_lawhub_categories() -> str:
    """اعرض فئات العقود المتاحة على الموسوعة القانونية (lawhub.info)."""
    cats = list_categories()
    return "فئات العقود المتاحة:\n" + "\n".join(f"▸ {name}" for name in cats)


@tool
def search_lawhub_by_category(
    category: Annotated[str, "اسم فئة العقد بالعربية، مثال: بيع، ايجار، عمل، شركات، رهن، هبة، زواج، قرض"],
) -> str:
    """
    اعرض كل العقود المتاحة داخل فئة معينة من الموسوعة القانونية (lawhub.info).
    استخدم هذه الأداة فقط إذا فشل search_lawhub_contracts في إيجاد نتيجة مناسبة.
    """
    results = list_contracts(category)
    if not results:
        return f"لم يتم العثور على فئة باسم '{category}'. استخدم list_lawhub_categories لمعرفة الفئات المتاحة."

    lines = [f"عقود متاحة في فئة '{category}':\n"]
    for r in results[:30]:
        lines.append(f"▸ {r['title']} — post_id: {r['post_id']}")
    return "\n".join(lines)


@tool
def fetch_lawhub_contract(
    post_id: Annotated[str, "رقم المعرف (post_id) الذي ظهر في نتيجة search_lawhub_contracts"],
) -> str:
    """
    اجلب النص الكامل لعقد معين من الموسوعة القانونية (lawhub.info) باستخدام رقمه المرجعي.
    استخدم preview/استخدم هذا النص لملء بيانات المستخدم وعرض العقد كاملاً في الرد.
    """
    try:
        text = fetch_contract_text(post_id)
        return text
    except Exception as e:
        logger.error("lawhub fetch failed for post %s: %s", post_id, e, exc_info=True)
        return f"تعذّر جلب العقد رقم {post_id} — {e}"
