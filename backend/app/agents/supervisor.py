"""
Supervisor agent — routes user requests to the correct specialist agent.

Routing logic:
  - Legal question / law search  →  legal_research_agent
  - Document / image upload      →  document_agent  →  optionally legal_research_agent
  - Contract creation / drafting →  contract_agent
"""

import logging
from contextvars import ContextVar
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.prebuilt import create_react_agent
from langchain_core.tools import tool
from typing import Annotated

from app.config.settings import make_llm
from app.agents.legal_research_agent import legal_research_agent
from app.agents.document_agent import document_agent
from app.agents.contract_agent import contract_agent

logger = logging.getLogger(__name__)

# Recent conversation turns, refreshed by run() before each supervisor call,
# so sub-agents (which are otherwise stateless) can resolve follow-up questions.
#
# A ContextVar (not a plain module-level list) so concurrent requests never
# see each other's history: asyncio gives each request's coroutine chain its
# own isolated context, so .set() here is invisible to any other in-flight
# request, even though they all reference the same variable in code.
_recent_history_var: ContextVar[list] = ContextVar("_recent_history", default=[])
_HISTORY_WINDOW = 6


def _content_to_text(content) -> str:
    """Gemini may return message content as a list of blocks instead of str."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "\n".join(
            part if isinstance(part, str) else part.get("text", "") for part in content
        )
    return str(content)


# ── Sub-agent wrappers as tools ────────────────────────────────


@tool(return_direct=True)
async def ask_legal_research(
    query: Annotated[
        str, "السؤال القانوني المطلوب البحث عنه في قاعدة بيانات القوانين المصرية"
    ],
) -> str:
    """
    ابحث في قاعدة بيانات القوانين المصرية عن إجابة قانونية.
    استخدم هذه الأداة لأي سؤال يتعلق بالقانون أو العقوبات أو الحقوق.
    """
    result = await legal_research_agent.ainvoke(
        {"messages": [*_recent_history_var.get(), HumanMessage(content=query)]},
        config={"recursion_limit": 50},
    )
    return _content_to_text(result["messages"][-1].content)


@tool
async def ask_document_agent(
    query: Annotated[str, "الطلب المتعلق بالوثيقة مع النص المستخرج من الصور إن وجد"],
) -> str:
    """
    حلّل وثيقة قانونية أو استخرج معلومات منها.
    استخدم هذه الأداة عندما يرفع المستخدم صورة أو وثيقة.
    """
    result = await document_agent.ainvoke(
        {"messages": [*_recent_history_var.get(), HumanMessage(content=query)]},
        config={"recursion_limit": 50},
    )
    return _content_to_text(result["messages"][-1].content)


@tool(return_direct=True)
async def ask_contract_agent(
    query: Annotated[str, "طلب إنشاء أو تعديل عقد مع البيانات المتوفرة"],
) -> str:
    """
    أنشئ أو عدّل عقداً قانونياً مصرياً وأعد نصه الكامل.
    استخدم هذه الأداة لطلبات إنشاء عقود الإيجار أو العمل أو السرية أو البيع.
    """
    result = await contract_agent.ainvoke(
        {"messages": [*_recent_history_var.get(), HumanMessage(content=query)]},
        config={"recursion_limit": 50},
    )

    # The LLM tends to summarise instead of copying the full contract text.
    # Grab the actual tool output (local template or lawhub fetch) from the
    # message history and return it directly — guaranteed to be the full text.
    contract_text = None
    source_note = ""
    for msg in result["messages"]:
        name = getattr(msg, "name", None)
        if name == "preview_contract":
            contract_text = _content_to_text(msg.content)
            break
        if name == "fetch_lawhub_contract":
            contract_text = _content_to_text(msg.content)
            source_note = "\n\nالمصدر: الموسوعة القانونية (lawhub.info)"
            break

    if contract_text:
        return contract_text + source_note

    # Fallback: return whatever the agent said
    return _content_to_text(result["messages"][-1].content)


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
5. صياغة الاستعلام (مهم جداً): اكتب للوكيل المتخصص استعلاماً مكتمل المعنى بذاته:
   - إذا كان سؤال المستخدم امتداداً لسؤال سابق (مثل: "طيب ولو كان بالإكراه؟")
     → ادمج سياق المحادثة السابقة في استعلام واحد مكتمل المعنى.
   - مثال: بعد سؤال عن السرقة، لو قال المستخدم "طيب لو معاه سلاح؟"
     → الاستعلام الصحيح: "عقوبة السرقة مع حمل سلاح في القانون المصري"

═══════════════════════════════════════════
                   قواعد عامة
═══════════════════════════════════════════

- لا تجب من معرفتك الذاتية — دائماً استخدم الوكيل المناسب.
- إجابة ask_legal_research نهائية ومنسّقة — أعدها للمستخدم كما هي حرفياً،
  دون تلخيص أو إعادة صياغة أو حذف النصوص القانونية منها.
- إذا كان الطلب غير قانوني تماماً → "أنا مساعد قانوني متخصص في القانون المصري فقط."
- إذا أعادت أداة contract_agent مساراً لملف (ينتهي بـ .docx) → مرّره في ردّك بهذا الشكل:
  [FILE:{مسار الملف}]
- أجب فقط بالعربية.

═══════════════════════════════════════════
        سرية آلية العمل (إلزامي)
═══════════════════════════════════════════

- أسماء الأدوات والوكلاء الداخلية (مثل ask_contract_agent وask_legal_research
  وask_document_agent و"وكيل العقود" و"الباحث القانوني") سرية تماماً —
  يُحظر ذكرها أو الإشارة إليها في أي رد يراه المستخدم بأي شكل.
- لا تشرح للمستخدم آلية التوجيه الداخلية ولا أنك "ستوجّه الطلب" لأي جهة.
- أنت "المستشار" فقط في نظر المستخدم — إما أن تستدعي الأداة المناسبة بصمت،
  أو (إن احتجت تفاصيل أكثر) تسأل المستخدم مباشرةً بصفتك "المستشار" دون ذكر أي
  اسم داخلي أو أي إشارة إلى وجود وكلاء أو أدوات.
"""

_llm = make_llm()

supervisor = create_react_agent(
    model=_llm,
    tools=[ask_legal_research, ask_document_agent, ask_contract_agent],
    prompt=_SYSTEM,
)
logger.info("Supervisor ready — routing to 3 specialist agents")


# ── Public interface ───────────────────────────────────────────

def _extract_response(messages: list) -> str:
    """
    The supervisor's own LLM tends to re-paraphrase what it receives from
    sub-agents. Grab the raw tool output directly instead of trusting the
    supervisor's final summary.
    """
    response    = None
    legal_parts = []
    used_tools  = set()
    for msg in messages:
        name = getattr(msg, "name", None)
        if name == "ask_contract_agent":
            response = _content_to_text(msg.content)
            break
        if name == "ask_legal_research":
            legal_parts.append(_content_to_text(msg.content))
        if name:
            used_tools.add(name)

    # Legal-research answers are already fully formatted — return them
    # verbatim, but only when no other agent contributed (e.g. a document
    # analysis step), in which case the supervisor's synthesis is needed.
    if response is None and legal_parts and used_tools == {"ask_legal_research"}:
        response = "\n\n".join(legal_parts)

    if response is None:
        response = _content_to_text(messages[-1].content)
    return response


async def astream(
    text: str,
    conv_history: list,
    extracted_text: str = "",
):
    """
    Entry point for the UI — streams the supervisor's turn as it runs.

    `extracted_text` is already-OCR'd / human-reviewed document text (see
    app.agents.ocr_agent) to attach to the user's message, if any.

    Yields dicts:
      - {"type": "chunk", "text": "..."}         live answer tokens, as they
        become available. Not every turn produces any — e.g. a contract's
        text is copied verbatim from a tool call rather than generated
        token-by-token, so nothing streams for that path (see below).
      - {"type": "done", "response": "...", "docx_path": None}   the final,
        authoritative answer. Always sent last, exactly once. The frontend
        should treat this as the source of truth over anything streamed.

    `conv_history` is mutated in place (human + assistant turns appended),
    matching the previous synchronous `run()` contract.
    """
    content = text
    if extracted_text.strip():
        content = f"{text}\n\n[نص مستخرج من الملفات المرفوعة]\n{extracted_text}"

    conv_history.append(HumanMessage(content=content))

    # Refresh this request's history window for sub-agents (exclude the
    # current message — the supervisor's rewritten query already carries it).
    # Isolated per-request via ContextVar — see the module docstring above.
    _recent_history_var.set(conv_history[:-1][-_HISTORY_WINDOW:])

    # Text generated *inside* ask_contract_agent or ask_document_agent is
    # never the final answer shown to the user: contract text is swapped for
    # a verbatim tool result (see _extract_response), and document analysis
    # is fed back to the supervisor's own model for a further synthesis
    # turn. Only ask_legal_research's own generation is used as-is. Track
    # those tools' run_ids so nested chat-model chunks under them are
    # skipped, leaving only the text that actually ends up in the response.
    suppressed_run_ids: set[str] = set()
    root_run_id = None
    final_output = None

    try:
        async for event in supervisor.astream_events(
            {"messages": conv_history},
            config={"recursion_limit": 100},
        ):
            if root_run_id is None and not event.get("parent_ids"):
                root_run_id = event["run_id"]

            kind = event["event"]

            if kind == "on_tool_start" and event["name"] in (
                "ask_contract_agent", "ask_document_agent",
            ):
                suppressed_run_ids.add(event["run_id"])

            elif kind == "on_chat_model_stream":
                if suppressed_run_ids.intersection(event.get("parent_ids", ())):
                    continue
                piece = _content_to_text(event["data"]["chunk"].content)
                if piece:
                    yield {"type": "chunk", "text": piece}

            elif kind == "on_chain_end" and event["run_id"] == root_run_id:
                final_output = event["data"]["output"]

        if final_output is None:
            raise RuntimeError("supervisor stream ended without a final result")

        response = _extract_response(final_output["messages"])
    except Exception as e:
        logger.error("Supervisor error: %s", e, exc_info=True)
        response = f"⚠️ حدث خطأ أثناء المعالجة: {e}"

    conv_history.append(AIMessage(content=response))
    yield {"type": "done", "response": response, "docx_path": None}
