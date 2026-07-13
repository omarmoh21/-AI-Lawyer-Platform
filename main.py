import asyncio
import logging
import tempfile
import warnings

warnings.filterwarnings("ignore", category=DeprecationWarning, module="langgraph")

import gradio as gr

from app.agents.supervisor import run as supervisor_run
from app.services.asr.elevenlabs_asr import transcribe

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
def _collect_image_paths(image_files: list | None) -> list[str]:
    import os
    paths = []
    if image_files:
        for f in image_files[:3]:
            p = f if isinstance(f, str) else getattr(f, "name", None)
            if p and os.path.exists(p):
                paths.append(p)
    return paths


# ── Gradio event handlers ──────────────────────────────────────
async def respond(
    message: str,
    image_files: list | None,
    chat_history: list,
    conv_history: list,
):
    text = (message or "").strip()
    if not text:
        return chat_history, conv_history, gr.update(), gr.update(), None

    paths        = _collect_image_paths(image_files)
    display_text = text + (f"\n\n📎 صور مرفوعة: {len(paths)}" if paths else "")
    chat_history.append({"role": "user", "content": display_text})

    response, conv_history, docx_path = await asyncio.to_thread(
        supervisor_run, text, paths, conv_history
    )
    chat_history.append({"role": "assistant", "content": response})

    file_update = (
        gr.update(value=docx_path, visible=True)
        if docx_path else
        gr.update(visible=False)
    )
    return chat_history, conv_history, "", None, file_update


async def do_transcribe(audio_path: str | None) -> str:
    if not audio_path:
        return "لم يتم رفع أي تسجيل."
    try:
        return await asyncio.to_thread(transcribe, audio_path)
    except Exception as e:
        logger.error("ASR failed: %s", e, exc_info=True)
        return f"⚠️ فشل التفريغ: {e}"


def reset_chat():
    return [], [], "", None, None


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
        file_types=["image"],
        label="📎 رفع صور وثائق قانونية (اختياري — الحد الأقصى 3 صور)",
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
    def _update_download(path):
        if path:
            return gr.update(value=path, visible=True)
        return gr.update(visible=False)

    text_inputs  = [msg_input, image_input, chatbot, conv_history]
    text_outputs = [chatbot, conv_history, msg_input, image_input, contract_download]

    send_btn.click(respond, inputs=text_inputs, outputs=text_outputs)
    msg_input.submit(respond, inputs=text_inputs, outputs=text_outputs)

    audio_input.change(
        fn=do_transcribe,
        inputs=[audio_input],
        outputs=[msg_input],
    )

    reset_btn.click(
        reset_chat,
        outputs=[chatbot, conv_history, msg_input, image_input, contract_download],
    )


def main():
    demo.launch(
        share=False,
        inbrowser=True,
        allowed_paths=[tempfile.gettempdir()],  # let Gradio serve contract .docx files
    )


if __name__ == "__main__":
    main()
