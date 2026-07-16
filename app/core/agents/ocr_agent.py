"""LangGraph agent that extracts text from one or more user-supplied files
(images and/or a single PDF) using the Gemini OCR service, then pauses for
a human to verify (approve, edit, or request re-extraction) before producing
a final result.

Multiple files can be uploaded together: any number of JPG/PNG images plus
at most one PDF. Files are treated as pages of a single logical document and
processed in upload order.

For the PDF, each page is inspected with PyMuPDF (fitz): pages that already
contain an extractable text layer are read directly (no OCR needed), while
pages that are scanned images -- along with any standalone image files --
are sent to Gemini for OCR in a single batched request. Results are merged
back in original upload order.

The OCR prompt and Gemini client/retry logic live in
app.services.ocr.gemini_ocr — this agent only handles file/page bookkeeping
and the human-in-the-loop review flow.

Run directly for a CLI demo:
    uv run python app/agents/ocr_agent.py path/to/file1.pdf path/to/file2.jpg
"""

from __future__ import annotations

import sys
import uuid
from pathlib import Path
from typing import Literal, TypedDict

import fitz  # PyMuPDF
from google.genai import types as genai_types
from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt
from PIL import Image

from core.services.ocr.gemini_ocr import extract_batch

SUPPORTED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png"}

EXTRACTION_METHOD_LABELS = {
    "direct": "direct text extraction (no OCR)",
    "ocr": "OCR model (Gemini)",
    "mixed": "mixed (some pages direct, some via OCR)",
}


def validate_file(file_path: str) -> str:
    """Ensure the uploaded file is a PDF, JPG, or PNG. Returns the lowercase extension."""
    ext = Path(file_path).suffix.lower()
    if ext not in SUPPORTED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type {ext!r}. Only PDF, JPG, and PNG files are accepted."
        )
    return ext


class PageUnit(TypedDict):
    kind: Literal["image", "pdf_page"]
    file_path: str
    page_index: int | None
    text: str | None  # populated directly if extractable; left None if OCR is needed


class OcrState(TypedDict):
    file_paths: list[str]
    user_message: str
    extracted_text: str
    extraction_method: str
    final_text: str
    verified: bool
    feedback: str


def _build_page_units(file_paths: list[str]) -> list[PageUnit]:
    """Validate the uploaded files and expand them into an ordered list of page
    units (one per image, one per PDF page)."""
    if not file_paths:
        raise ValueError("Please upload at least one PDF, JPG, or PNG file.")

    units: list[PageUnit] = []
    pdf_seen = False
    for file_path in file_paths:
        ext = validate_file(file_path)
        if ext == ".pdf":
            if pdf_seen:
                raise ValueError("Only one PDF file is allowed per upload.")
            pdf_seen = True

            doc = fitz.open(file_path)
            try:
                for i, page in enumerate(doc):
                    text = page.get_text("text").strip()
                    units.append(
                        {
                            "kind": "pdf_page",
                            "file_path": file_path,
                            "page_index": i,
                            "text": text or None,
                        }
                    )
            finally:
                doc.close()
        else:
            units.append(
                {
                    "kind": "image",
                    "file_path": file_path,
                    "page_index": None,
                    "text": None,
                }
            )

    return units


def _ocr_part_for_unit(unit: PageUnit) -> Image.Image | genai_types.Part:
    """Build the Gemini content part for a single page unit that needs OCR."""
    if unit["kind"] == "image":
        return Image.open(unit["file_path"])

    doc = fitz.open(unit["file_path"])
    try:
        page_doc = fitz.open()
        page_doc.insert_pdf(
            doc, from_page=unit["page_index"], to_page=unit["page_index"]
        )
        pdf_bytes = page_doc.tobytes()
        page_doc.close()
    finally:
        doc.close()
    return genai_types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf")


def _run_ocr(units: list[PageUnit], user_message: str, feedback: str) -> None:
    """Fill in `text` (in place) for every unit that needs OCR, via one batched
    Gemini call through the shared gemini_ocr service."""
    ocr_indices = [i for i, u in enumerate(units) if u["text"] is None]
    if not ocr_indices:
        return

    parts = [_ocr_part_for_unit(units[i]) for i in ocr_indices]
    texts = extract_batch(parts, user_message=user_message, feedback=feedback)

    for i, chunk in zip(ocr_indices, texts):
        units[i]["text"] = chunk


def extract_text_node(state: OcrState) -> dict:
    """Extract text from all uploaded files, using direct extraction for PDF
    pages that already have a text layer and batched OCR for everything else."""
    feedback = state.get("feedback", "")
    user_message = state.get("user_message", "")
    units = _build_page_units(state["file_paths"])

    ocr_needed_count = sum(1 for u in units if u["text"] is None)
    if ocr_needed_count:
        _run_ocr(units, user_message, feedback)

    extracted_text = "\n\n".join(u["text"] or "" for u in units)

    if ocr_needed_count == 0:
        extraction_method = "direct"
    elif ocr_needed_count == len(units):
        extraction_method = "ocr"
    else:
        extraction_method = "mixed"

    return {
        "extracted_text": extracted_text,
        "extraction_method": extraction_method,
        "feedback": "",
    }


def human_review_node(state: OcrState) -> Command[Literal["extract", "__end__"]]:
    """Pause the graph and hand the extracted text to a human for verification."""
    decision = interrupt(
        {
            "question": "Please verify the extracted text.",
            "extracted_text": state["extracted_text"],
            "extraction_method": state["extraction_method"],
        }
    )

    action = decision.get("action")

    if action == "approve":
        return Command(
            goto=END, update={"final_text": state["extracted_text"], "verified": True}
        )

    if action == "edit":
        edited_text = decision.get("text", state["extracted_text"])
        return Command(goto=END, update={"final_text": edited_text, "verified": True})

    if action == "retry":
        return Command(
            goto="extract", update={"feedback": decision.get("feedback", "")}
        )

    raise ValueError(f"Unknown human review action: {action!r}")


def build_graph():
    graph = StateGraph(OcrState)
    graph.add_node("extract", extract_text_node)
    graph.add_node("review", human_review_node)

    graph.add_edge(START, "extract")
    graph.add_edge("extract", "review")

    return graph.compile(checkpointer=InMemorySaver())


# Shared, process-wide graph instance. The checkpointer lives on this object,
# so callers that pause on the human-review interrupt (e.g. the Gradio UI)
# must invoke/resume *this* instance -- each call to build_graph() would
# start from a fresh, empty checkpointer and lose any in-flight thread.
ocr_graph = build_graph()


def _prompt_human(extracted_text: str, extraction_method: str) -> dict:
    """Collect a verification decision from the terminal user."""
    print("\n--- Extracted text ---")
    print(extracted_text)
    print("-----------------------")
    print(
        f"Extraction method: {EXTRACTION_METHOD_LABELS.get(extraction_method, extraction_method)}"
    )
    choice = input("Approve this text? [y]es / [e]dit / [r]etry: ").strip().lower()

    if choice in ("y", "yes"):
        return {"action": "approve"}
    if choice in ("e", "edit"):
        edited = input("Enter the corrected text:\n")
        return {"action": "edit", "text": edited}
    if choice in ("r", "retry"):
        feedback = input("What should be fixed in the next attempt?\n")
        return {"action": "retry", "feedback": feedback}

    print("Unrecognized choice, defaulting to retry.")
    return {"action": "retry", "feedback": ""}


def run_ocr_with_human_review(file_paths: list[str], user_message: str = "") -> str:
    """Run the OCR graph end-to-end, prompting the terminal user at the human-in-the-loop step."""
    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    result = ocr_graph.invoke(
        {"file_paths": file_paths, "user_message": user_message}, config=config
    )

    while "__interrupt__" in result:
        payload = result["__interrupt__"][0].value
        decision = _prompt_human(
            payload["extracted_text"], payload["extraction_method"]
        )
        result = ocr_graph.invoke(Command(resume=decision), config=config)

    return result["final_text"]


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(
            "Usage: uv run python app/agents/ocr_agent.py <file1> [file2 ...] (pdf, jpg, or png)"
        )
        sys.exit(1)

    final_text = run_ocr_with_human_review(sys.argv[1:])
    print("\n=== Final verified text ===")
    print(final_text)
