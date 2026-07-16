import os
import logging
import tempfile
from typing import Annotated
from langchain_core.tools import tool

from app.templates.contracts import TEMPLATES, TEMPLATE_NAMES_AR, REQUIRED_FIELDS
from app.services.document.docx_generator import generate_docx

logger = logging.getLogger(__name__)


@tool
def list_contract_types() -> str:
    """اعرض أنواع العقود المتاحة وحقولها المطلوبة."""
    lines = ["أنواع العقود المتاحة:\n"]
    for key, name_ar in TEMPLATE_NAMES_AR.items():
        fields = ", ".join(REQUIRED_FIELDS[key])
        lines.append(f"▸ {key} — {name_ar}\n  الحقول المطلوبة: {fields}\n")
    return "\n".join(lines)


@tool
def preview_contract(
    contract_type: Annotated[str, "نوع العقد: rental أو employment أو nda أو sale"],
    fields: Annotated[dict, "قاموس بالحقول وقيمها، مثال: {\"LANDLORD_NAME\": \"أحمد علي\"}"],
) -> str:
    """
    املأ قالب العقد بالبيانات المقدمة وأعد النص كاملاً للمراجعة.
    استخدم هذه الأداة قبل توليد الملف لتأكيد صحة البيانات مع المستخدم.
    """
    contract_type = contract_type.strip().lower()
    if contract_type not in TEMPLATES:
        available = ", ".join(TEMPLATES.keys())
        return f"نوع العقد غير معروف. الأنواع المتاحة: {available}"

    template = TEMPLATES[contract_type]
    missing  = [f for f in REQUIRED_FIELDS[contract_type] if f not in fields]

    filled = template
    for key, value in fields.items():
        filled = filled.replace(f"{{{key}}}", str(value))

    result = filled
    if missing:
        result += f"\n\n⚠️ حقول ناقصة (ستظل فارغة): {', '.join(missing)}"
    return result


@tool
def generate_contract_file(
    contract_type: Annotated[str, "نوع العقد: rental أو employment أو nda أو sale"],
    fields: Annotated[dict, "قاموس بالحقول وقيمها"],
) -> str:
    """
    أنشئ ملف .docx للعقد وأعد مسار الملف.
    استخدم هذه الأداة فقط بعد مراجعة المستخدم للنص عبر preview_contract.
    """
    contract_type = contract_type.strip().lower()
    if contract_type not in TEMPLATES:
        return f"نوع العقد غير معروف."

    template = TEMPLATES[contract_type]
    filled   = template
    for key, value in fields.items():
        filled = filled.replace(f"{{{key}}}", str(value))

    title    = TEMPLATE_NAMES_AR[contract_type]
    docx_bytes = generate_docx(filled, title)

    # Save to a temp file that Gradio can serve as a download
    suffix = f"_{contract_type}.docx"
    tmp    = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    tmp.write(docx_bytes)
    tmp.close()

    logger.info("Contract file created: %s", tmp.name)
    return tmp.name  # returned to Gradio as a file path
