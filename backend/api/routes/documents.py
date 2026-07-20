"""Document endpoints — expose the OCR agent's extract → human-review flow.

Flow:
  1. POST /documents/extract  (multipart files) → runs OCR, pauses at the
     human-review interrupt, returns the extracted text for verification.
  2. POST /documents/review   ({thread_id, action}) → resumes the paused graph:
       - approve          → returns the final text
       - edit  (+ text)   → returns the edited text as final
       - retry (+ feedback) → re-extracts and returns a new review payload
  3. The client then sends the final text to /chat as `extracted_text`.
"""

import logging
import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from langgraph.types import Command
from pydantic import BaseModel

from app.agents.ocr_agent import ocr_graph, validate_file

router = APIRouter(tags=["documents"])
logger = logging.getLogger(__name__)


def _interrupt_payload(result: dict) -> dict | None:
    if "__interrupt__" in result:
        return result["__interrupt__"][0].value
    return None


def _review_or_done(thread_id: str, result: dict) -> dict:
    payload = _interrupt_payload(result)
    if payload is not None:
        return {
            "thread_id": thread_id,
            "status": "review",
            "extracted_text": payload["extracted_text"],
            "extraction_method": payload["extraction_method"],
        }
    return {
        "thread_id": thread_id,
        "status": "done",
        "final_text": result.get("final_text", ""),
    }


@router.post("/documents/extract")
async def extract_documents(
    files: list[UploadFile] = File(...),
    message: str = Form(""),
):
    if not files:
        raise HTTPException(400, "No files uploaded.")

    paths: list[str] = []
    for f in files:
        filename = f.filename or ""
        try:
            validate_file(filename)
        except ValueError as e:
            raise HTTPException(400, str(e))
        tmp = tempfile.NamedTemporaryFile(
            delete=False, suffix=Path(filename).suffix.lower()
        )
        tmp.write(await f.read())
        tmp.close()
        paths.append(tmp.name)

    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}
    try:
        result = await ocr_graph.ainvoke(
            {"file_paths": paths, "user_message": message}, config=config
        )
    except ValueError as e:
        raise HTTPException(400, str(e))

    logger.info("documents/extract — thread %s, %d file(s)", thread_id, len(paths))
    return _review_or_done(thread_id, result)


class ReviewRequest(BaseModel):
    thread_id: str
    action: str  # "approve" | "edit" | "retry"
    text: str | None = None  # for action == "edit"
    feedback: str = ""       # for action == "retry"


@router.post("/documents/review")
async def review_documents(req: ReviewRequest):
    if req.action not in ("approve", "edit", "retry"):
        raise HTTPException(400, f"Unknown action {req.action!r}.")

    decision: dict = {"action": req.action}
    if req.action == "edit":
        decision["text"] = req.text or ""
    if req.action == "retry":
        decision["feedback"] = req.feedback

    config = {"configurable": {"thread_id": req.thread_id}}
    try:
        result = await ocr_graph.ainvoke(Command(resume=decision), config=config)
    except ValueError as e:
        raise HTTPException(400, str(e))

    return _review_or_done(req.thread_id, result)