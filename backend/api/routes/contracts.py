"""Contract export endpoint.

The Contracts page lets a user pick a template and fill in fields entirely
client-side (see frontend/src/pages/Contracts.tsx — the templates there
mirror app/templates/contracts.py). This endpoint takes the already-filled
contract text the user previewed and returns it as a downloadable PDF, so
the download always matches exactly what was shown on screen.
"""

import asyncio
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.auth.dependencies import get_current_user
from app.db.models import User
from app.services.document.pdf_generator import generate_pdf
from app.templates.contracts import (
    FIELD_LABELS,
    REQUIRED_FIELDS,
    TEMPLATE_DESCRIPTIONS_AR,
    TEMPLATE_NAMES_AR,
    TEMPLATES,
)

router = APIRouter(tags=["contracts"])
logger = logging.getLogger(__name__)


class FieldDef(BaseModel):
    key: str
    label: str


class ContractTemplate(BaseModel):
    key: str
    title: str
    description: str
    fields: list[FieldDef]
    template: str


@router.get("/contracts/templates", response_model=list[ContractTemplate])
def list_templates() -> list[ContractTemplate]:
    """Return every contract template with its full text and labeled fields,
    so the frontend renders from a single backend source of truth."""
    result: list[ContractTemplate] = []
    for key, template in TEMPLATES.items():
        fields = [
            FieldDef(key=f, label=FIELD_LABELS.get(f, f))
            for f in REQUIRED_FIELDS[key]
        ]
        result.append(
            ContractTemplate(
                key=key,
                title=TEMPLATE_NAMES_AR[key],
                description=TEMPLATE_DESCRIPTIONS_AR.get(key, ""),
                fields=fields,
                template=template,
            )
        )
    return result


class ContractDownloadRequest(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    text: str = Field(..., min_length=1)
    contract_type: str = Field(default="contract", max_length=50)


@router.post("/contracts/download")
async def download_contract(
    req: ContractDownloadRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        pdf_bytes = await asyncio.to_thread(generate_pdf, req.text, req.title)
    except Exception:
        logger.exception("PDF generation failed for user %s", current_user.id)
        raise HTTPException(500, "تعذّر إنشاء ملف PDF.")

    safe_type = "".join(c for c in req.contract_type if c.isalnum()) or "contract"
    filename = f"{safe_type}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
