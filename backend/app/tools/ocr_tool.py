import logging
from typing import Annotated
from langchain_core.tools import tool

from app.services.ocr.gemini_ocr import extract_text

logger = logging.getLogger(__name__)


@tool
async def ocr_tool(
    image_paths: Annotated[list[str], "قائمة مسارات الصور"],
    user_message: Annotated[str, "رسالة أو توجيه إضافي من المستخدم"] = "",
) -> str:
    """
    استخرج النص من صور الوثائق القانونية.
    استخدم هذه الأداة عندما يرفع المستخدم صورة أو أكثر.
    لا تستخدمها إذا لم يكن هناك صور مرفوعة.
    """
    if not image_paths:
        return "لم يتم تمرير أي صور."

    results = []
    for i, path in enumerate(image_paths, 1):
        try:
            text = await extract_text(path, user_message)
            results.append(f"[نتيجة الصورة {i}]\n{text}")
        except Exception as e:
            logger.error("OCR tool failed image %d: %s", i, e, exc_info=True)
            results.append(f"[نتيجة الصورة {i}]\nفشل استخراج النص: {e}")
    return "\n\n".join(results)
