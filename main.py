"""Gradio app for trying out the LangGraph OCR agent with human-in-the-loop review."""

import uuid

import gradio as gr
from langgraph.types import Command

from app.agents.ocr_agent import EXTRACTION_METHOD_LABELS, build_graph

graph = build_graph()


def _method_label(extraction_method: str) -> str:
    return EXTRACTION_METHOD_LABELS.get(extraction_method, extraction_method)


def start_ocr(file_paths: list[str] | None):
    if not file_paths:
        return "", None, "", "Please upload at least one PDF, JPG, or PNG file first."

    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    try:
        result = graph.invoke({"file_paths": file_paths}, config=config)
    except ValueError as e:
        return "", None, "", str(e)

    payload = result["__interrupt__"][0].value
    extracted_text = payload["extracted_text"]
    method_label = _method_label(payload["extraction_method"])
    return (
        extracted_text,
        config,
        method_label,
        "Extraction complete. Review the text below, then approve or retry.",
    )


def approve(text: str, config: dict | None):
    if config is None:
        return "", "Run OCR first."
    result = graph.invoke(
        Command(resume={"action": "edit", "text": text}), config=config
    )
    return result["final_text"], "Approved and saved as final text."


def retry(feedback: str, config: dict | None):
    if config is None:
        return "", "", "Run OCR first."
    result = graph.invoke(
        Command(resume={"action": "retry", "feedback": feedback}), config=config
    )
    payload = result["__interrupt__"][0].value
    extracted_text = payload["extracted_text"]
    method_label = _method_label(payload["extraction_method"])
    return (
        extracted_text,
        method_label,
        "Re-extracted. Review the text below, then approve or retry.",
    )


with gr.Blocks(title="OCR Agent - Human in the Loop") as demo:
    gr.Markdown(
        "# OCR Agent\n"
        "Upload up to 3 images (JPG/PNG) and/or a single PDF, extract the text with Gemini 2.5 Flash, "
        "then verify it. The combined page count (PDF pages + one page per image) must not exceed 3. "
        "Edit the text directly if needed, or request a retry with feedback before approving."
    )

    config_state = gr.State(None)

    with gr.Row():
        files_input = gr.File(
            label="Upload file(s) (PDF, JPG, or PNG - max 3 pages total)",
            file_types=[".pdf", ".jpg", ".jpeg", ".png"],
            file_count="multiple",
            type="filepath",
        )
        with gr.Column():
            extracted_box = gr.Textbox(label="Extracted text (editable)", lines=12)
            method_box = gr.Textbox(label="Extraction method", interactive=False)
            status_box = gr.Textbox(label="Status", interactive=False)

    run_btn = gr.Button("Run OCR", variant="primary")

    with gr.Row():
        with gr.Column():
            approve_btn = gr.Button("Approve / Save", variant="primary")
        with gr.Column():
            feedback_box = gr.Textbox(
                label="Feedback for retry", placeholder="What should be fixed?"
            )
            retry_btn = gr.Button("Retry extraction")

    final_box = gr.Textbox(label="Final verified text", lines=12, interactive=False)

    run_btn.click(
        start_ocr,
        inputs=[files_input],
        outputs=[extracted_box, config_state, method_box, status_box],
    )
    approve_btn.click(
        approve, inputs=[extracted_box, config_state], outputs=[final_box, status_box]
    )
    retry_btn.click(
        retry,
        inputs=[feedback_box, config_state],
        outputs=[extracted_box, method_box, status_box],
    )


def main():
    demo.launch()


if __name__ == "__main__":
    main()
