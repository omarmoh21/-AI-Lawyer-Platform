import asyncio
import logging
import tempfile
import uuid
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, module="langgraph")

import gradio as gr
from langgraph.types import Command

from core.agents.supervisor import run as supervisor_run
from core.agents.ocr_agent import ocr_graph, EXTRACTION_METHOD_LABELS
from core.services.asr.elevenlabs_asr import transcribe

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("app.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
logger = logging.getLogger(__name__)


# ── Helpers ────────────────────────────────────────────────────
def _collect_file_paths(files: list | None) -> list[str]:
    import os
    paths = []
    if files:
        for f in files:
            p = f if isinstance(f, str) else getattr(f, "name", None)
            if p and os.path.exists(p):
                paths.append(p)
    return paths


def _method_caption(extraction_method: str) -> str:
    label = EXTRACTION_METHOD_LABELS.get(extraction_method, extraction_method)
    return f"**طريقة الاستخراج:** {label}"


# ── Gradio event handlers ──────────────────────────────────────
async def respond(
    message: str,
    files: list | None,
    chat_history: list,
    conv_history: list,
):
    text = (message or "").strip()
    if not text:
        return (
            chat_history, conv_history, gr.update(), gr.update(), None,
            None, gr.update(), gr.update(), gr.update(), gr.update(),
        )

    paths = _collect_file_paths(files)
    display_text = text + (f"\n\n📎 ملفات مرفوعة: {len(paths)}" if paths else "")
    chat_history.append({"role": "user", "content": display_text})

    # Files attached: run OCR extraction and pause for human review instead
    # of answering immediately — the supervisor is only called once the
    # extracted text is approved (see on_approve).
    if paths:
        thread_config = {"configurable": {"thread_id": str(uuid.uuid4())}}
        try:
            result = await asyncio.to_thread(
                ocr_graph.invoke,
                {"file_paths": paths, "user_message": text},
                thread_config,
            )
        except Exception as e:
            logger.error("OCR extraction failed: %s", e, exc_info=True)
            chat_history.append(
                {"role": "assistant", "content": f"⚠️ فشل استخراج النص من الملفات: {e}"}
            )
            return (
                chat_history, conv_history, "", None, None,
                None, gr.update(visible=False), "", "", gr.update(interactive=True),
            )

        payload = result["__interrupt__"][0].value
        pending = {"config": thread_config, "text": text}
        chat_history.append(
            {
                "role": "assistant",
                "content": "📄 تم استخراج النص من الملفات المرفوعة — يرجى مراجعته أدناه قبل المتابعة.",
            }
        )
        return (
            chat_history, conv_history, "", None, None,
            pending,
            gr.update(visible=True),
            _method_caption(payload["extraction_method"]),
            payload["extracted_text"],
            gr.update(interactive=False),
        )

    response, conv_history, docx_path = await asyncio.to_thread(
        supervisor_run, text, conv_history
    )
    chat_history.append({"role": "assistant", "content": response})

    file_update = (
        gr.update(value=docx_path, visible=True)
        if docx_path else
        gr.update(visible=False)
    )
    return (
        chat_history, conv_history, "", None, file_update,
        None, gr.update(visible=False), "", "", gr.update(interactive=True),
    )


async def on_approve(
    edited_text: str,
    pending: dict | None,
    chat_history: list,
    conv_history: list,
):
    """Resume the OCR graph with the (possibly edited) reviewed text, then
    hand it to the supervisor for the real answer."""
    if not pending:
        return (
            chat_history, conv_history, gr.update(visible=False), "", "",
            None, gr.update(interactive=True), gr.update(),
        )

    try:
        result = await asyncio.to_thread(
            ocr_graph.invoke,
            Command(resume={"action": "edit", "text": edited_text}),
            pending["config"],
        )
        final_text = result["final_text"]
    except Exception as e:
        logger.error("OCR review confirmation failed: %s", e, exc_info=True)
        chat_history.append(
            {"role": "assistant", "content": f"⚠️ حدث خطأ أثناء تأكيد النص: {e}"}
        )
        return (
            chat_history, conv_history, gr.update(visible=False), "", "",
            None, gr.update(interactive=True), gr.update(),
        )

    response, conv_history, docx_path = await asyncio.to_thread(
        supervisor_run, pending["text"], conv_history, final_text
    )
    chat_history.append({"role": "assistant", "content": response})

    file_update = (
        gr.update(value=docx_path, visible=True)
        if docx_path else
        gr.update(visible=False)
    )
    return (
        chat_history, conv_history, gr.update(visible=False), "", "",
        None, gr.update(interactive=True), file_update,
    )


async def on_retry(feedback_text: str, pending: dict | None, chat_history: list):
    """Resume the OCR graph asking for a re-extraction, taking the human's
    feedback into account. Stays in the review panel with the new text."""
    if not pending:
        return chat_history, gr.update(), gr.update(), ""

    try:
        result = await asyncio.to_thread(
            ocr_graph.invoke,
            Command(resume={"action": "retry", "feedback": feedback_text}),
            pending["config"],
        )
    except Exception as e:
        logger.error("OCR retry failed: %s", e, exc_info=True)
        chat_history.append(
            {"role": "assistant", "content": f"⚠️ فشلت إعادة الاستخراج: {e}"}
        )
        return chat_history, gr.update(), gr.update(), ""

    payload = result["__interrupt__"][0].value
    return (
        chat_history,
        _method_caption(payload["extraction_method"]),
        payload["extracted_text"],
        "",
    )


async def do_transcribe(audio_path: str | None) -> str:
    if not audio_path:
        return "لم يتم رفع أي تسجيل."
    try:
        return await asyncio.to_thread(transcribe, audio_path)
    except Exception as e:
        logger.error("ASR failed: %s", e, exc_info=True)
        return f"⚠️ فشل التفريغ: {e}"


def reset_chat():
    return (
        [], [], "", None, None,
        None, gr.update(visible=False), "", "", gr.update(interactive=True),
    )


# ── UI ─────────────────────────────────────────────────────────
CSS = """
#chatbot { direction: rtl; }
.gradio-container { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; }
footer { display: none !important; }
"""

with gr.Blocks(title="المستشار القانوني", css=CSS) as demo:
    gr.Markdown(
        """
        <div style="text-align:center; direction:rtl; padding: 10px 0;">
          <h1 style="color:#1a5276;">⚖️ المستشار</h1>
          <p style="color:#555;">مساعد قانوني متخصص حصرياً في القانون المصري</p>
        </div>
        """
    )

    conv_history = gr.State([])
    ocr_pending  = gr.State(None)

    chatbot = gr.Chatbot(
        label="المحادثة",
        height=500,
        elem_id="chatbot",
        rtl=True,
        buttons=["copy", "copy_all"],
        placeholder="<div style='text-align:center;color:#aaa;margin-top:80px;'>ابدأ بطرح سؤالك القانوني...</div>",
    )

    with gr.Row():
        msg_input = gr.Textbox(
            placeholder="اكتب سؤالك القانوني هنا...",
            lines=2,
            show_label=False,
            scale=6,
            elem_id="msg_input",
            rtl=True,
        )
        send_btn = gr.Button("إرسال ➤", variant="primary", scale=1, min_width=100)

    audio_input = gr.Audio(
        sources=["microphone"],
        type="filepath",
        label="🎤 سجّل سؤالك — سيظهر النص تلقائياً في خانة السؤال بعد التوقف",
    )

    image_input = gr.File(
        file_count="multiple",
        file_types=["image", ".jpg", ".jpeg", ".png", ".pdf"],
        label="📎 رفع صور أو ملف PDF لوثائق قانونية (اختياري)",
    )

    with gr.Group(visible=False) as review_panel:
        review_method = gr.Markdown("")
        review_text = gr.Textbox(
            label="📝 النص المستخرج — راجعه أو عدّله قبل المتابعة",
            lines=8,
            rtl=True,
        )
        with gr.Row():
            approve_btn = gr.Button("✅ اعتماد ومتابعة", variant="primary")
            retry_btn = gr.Button("🔁 إعادة الاستخراج", variant="secondary")
        retry_feedback = gr.Textbox(
            label="ما الذي يجب تصحيحه في المحاولة القادمة؟ (اختياري)",
            lines=2,
            rtl=True,
        )

    contract_download = gr.File(
        label="📄 تحميل العقد",
        visible=False,
        interactive=False,
    )

    reset_btn = gr.Button("محادثة جديدة 🔄", variant="secondary")

    gr.Markdown(
        "<div style='text-align:center;color:#aaa;font-size:12px;direction:rtl;'>"
        "هذه المعلومات لأغراض قانونية عامة فقط ولا تُغني عن استشارة محامٍ متخصص."
        "</div>"
    )

    # ── Events ────────────────────────────────────────────────
    respond_outputs = [
        chatbot, conv_history, msg_input, image_input, contract_download,
        ocr_pending, review_panel, review_method, review_text, send_btn,
    ]
    text_inputs = [msg_input, image_input, chatbot, conv_history]

    send_btn.click(respond, inputs=text_inputs, outputs=respond_outputs)
    msg_input.submit(respond, inputs=text_inputs, outputs=respond_outputs)

    approve_btn.click(
        on_approve,
        inputs=[review_text, ocr_pending, chatbot, conv_history],
        outputs=[
            chatbot, conv_history, review_panel, review_method, review_text,
            ocr_pending, send_btn, contract_download,
        ],
    )

    retry_btn.click(
        on_retry,
        inputs=[retry_feedback, ocr_pending, chatbot],
        outputs=[chatbot, review_method, review_text, retry_feedback],
    )

    audio_input.change(
        fn=do_transcribe,
        inputs=[audio_input],
        outputs=[msg_input],
    )

    reset_btn.click(
        reset_chat,
        outputs=[
            chatbot, conv_history, msg_input, image_input, contract_download,
            ocr_pending, review_panel, review_method, review_text, send_btn,
        ],
    )


def main():
    demo.launch(
        share=False,
        inbrowser=True,
        allowed_paths=[tempfile.gettempdir()],  # let Gradio serve contract .docx files
    )


if __name__ == "__main__":
    main()
