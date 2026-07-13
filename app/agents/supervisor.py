"""
Supervisor agent — routes user requests to the correct specialist agent.

Routing logic:
  - Legal question / law search  →  legal_research_agent
  - Document / image upload      →  document_agent  →  optionally legal_research_agent
  - Contract creation / drafting →  contract_agent
"""

import logging
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
from typing import Annotated

from app.config.settings import make_llm
from app.agents.legal_research_agent import legal_research_agent
from app.agents.document_agent import document_agent
from app.agents.contract_agent import contract_agent
from app.services.ocr.gemini_ocr import extract_text

logger = logging.getLogger(__name__)


# ── Sub-agent wrappers as tools ────────────────────────────────

@tool
def ask_legal_research(
    query: Annotated[str, "السؤال القانوني المطلوب البحث عنه في قاعدة بيانات القوانين المصرية"],
) -> str:
    """
    ابحث في قاعدة بيانات القوانين المصرية عن إجابة قانونية.
    استخدم هذه الأداة لأي سؤال يتعلق بالقانون أو العقوبات أو الحقوق.
    """
    result = legal_research_agent.invoke(
        {"messages": [HumanMessage(content=query)]},
        config={"recursion_limit": 50},
    )
    return result["messages"][-1].content


@tool
def ask_document_agent(
    query: Annotated[str, "الطلب المتعلق بالوثيقة مع النص المستخرج من الصور إن وجد"],
) -> str:
    """
    حلّل وثيقة قانونية أو استخرج معلومات منها.
    استخدم هذه الأداة عندما يرفع المستخدم صورة أو وثيقة.
    """
    result = document_agent.invoke(
        {"messages": [HumanMessage(content=query)]},
        config={"recursion_limit": 50},
    )
    return result["messages"][-1].content


@tool
def ask_contract_agent(
    query: Annotated[str, "طلب إنشاء أو تعديل عقد مع البيانات المتوفرة"],
) -> str:
    """
    أنشئ أو عدّل عقداً قانونياً مصرياً وأعد نصه الكامل.
    استخدم هذه الأداة لطلبات إنشاء عقود الإيجار أو العمل أو السرية أو البيع.
    """
    result = contract_agent.invoke(
        {"messages": [HumanMessage(content=query)]},
        config={"recursion_limit": 50},
    )

    # The LLM tends to summarise instead of copying the full contract text.
    # Grab the actual tool output (local template or lawhub fetch) from the
    # message history and return it directly — guaranteed to be the full text.
    contract_text = None
    source_note   = ""
    for msg in result["messages"]:
        name = getattr(msg, "name", None)
        if name == "preview_contract":
            contract_text = msg.content
            break
        if name == "fetch_lawhub_contract":
            contract_text = msg.content
            source_note   = "\n\nالمصدر: الموسوعة القانونية (lawhub.info)"
            break

    if contract_text:
        return contract_text + source_note

    # Fallback: return whatever the agent said
    return result["messages"][-1].content


# ── Supervisor ─────────────────────────────────────────────────

_SYSTEM = """
أنت "المستشار" — المنسّق الرئيسي لمنصة المساعد القانوني المصري.
مهمتك فهم طلب المستخدم وتوجيهه للوكيل المتخصص المناسب.

═══════════════════════════════════════════
         قواعد التوجيه (إلزامية)
═══════════════════════════════════════════

1. سؤال قانوني (عقوبة / حق / تشريع / مادة قانونية) → ask_legal_research
2. رفع صورة أو وثيقة للتحليل أو الاستخراج → ask_document_agent
   - إذا احتاج تحليل الوثيقة بحثاً قانونياً بعد الاستخراج → استدعِ ask_legal_research أيضاً.
3. طلب إنشاء عقد أو تحرير عقد → ask_contract_agent
4. تحويل اللهجة العامية: قبل أي توجيه، حوّل الطلب إلى العربية الفصحى.

═══════════════════════════════════════════
                   قواعد عامة
═══════════════════════════════════════════

- لا تجب من معرفتك الذاتية — دائماً استخدم الوكيل المناسب.
- إذا كان الطلب غير قانوني تماماً → "أنا مساعد قانوني متخصص في القانون المصري فقط."
- إذا أعادت أداة contract_agent مساراً لملف (ينتهي بـ .docx) → مرّره في ردّك بهذا الشكل:
  [FILE:{مسار الملف}]
- أجب فقط بالعربية.
"""

_llm = make_llm()

supervisor = create_react_agent(
    model=_llm,
    tools=[ask_legal_research, ask_document_agent, ask_contract_agent],
    prompt=_SYSTEM,
)
logger.info("Supervisor ready — routing to 3 specialist agents")


# ── Public interface ───────────────────────────────────────────

def run(
    text: str,
    image_paths: list[str],
    conv_history: list,
) -> tuple[str, list, str | None]:
    """
    Entry point for the UI.
    Returns (response_text, updated_history, docx_file_path_or_None).
    """
    content = text

    # Pre-process images before sending to supervisor
    if image_paths:
        ocr_parts = []
        for i, path in enumerate(image_paths, 1):
            try:
                logger.info("OCR start — image %d: %s", i, path)
                extracted = extract_text(path, text)
                logger.info("OCR done  — image %d: %d chars", i, len(extracted))
                ocr_parts.append(f"[نص الصورة {i}]\n{extracted}")
            except Exception as e:
                logger.error("OCR failed — image %d: %s", i, e, exc_info=True)
                ocr_parts.append(f"[الصورة {i}: فشل الاستخراج — {e}]")
        content = f"{text}\n\n[نص مستخرج من الصور المرفوعة]\n" + "\n\n".join(ocr_parts)

    conv_history.append(HumanMessage(content=content))
    try:
        result = supervisor.invoke(
            {"messages": conv_history},
            config={"recursion_limit": 100},
        )

        # The supervisor's own LLM tends to re-paraphrase the contract text
        # it receives from ask_contract_agent. Grab the raw tool output
        # directly instead of trusting the supervisor's final summary.
        response = None
        for msg in result["messages"]:
            if getattr(msg, "name", None) == "ask_contract_agent":
                response = msg.content
                break

        if response is None:
            response = result["messages"][-1].content
    except Exception as e:
        logger.error("Supervisor error: %s", e, exc_info=True)
        response = f"⚠️ حدث خطأ أثناء المعالجة: {e}"

    conv_history.append(AIMessage(content=response))
    return response, conv_history, None
