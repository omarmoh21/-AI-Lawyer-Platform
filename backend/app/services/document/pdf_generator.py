"""Generate a formatted RTL Arabic .pdf file from a filled contract string.

Uses PyMuPDF's Story/HTML layout engine (already a project dependency via
`pymupdf`) instead of a dedicated PDF library — it shapes Arabic text
(HarfBuzz) and handles bidi/RTL correctly out of the box.
"""

import html
import io
import logging

import fitz

logger = logging.getLogger(__name__)

_PAGE_RECT = fitz.paper_rect("a4")
_MARGIN = 54  # ~0.75in
_CONTENT_RECT = _PAGE_RECT + (_MARGIN, _MARGIN, -_MARGIN, -_MARGIN)

_STYLE = """
body { font-family: sans-serif; direction: rtl; text-align: right; font-size: 12px; line-height: 1.9; }
h1 { text-align: center; color: #1A5276; font-size: 18px; margin-bottom: 1.5em; }
p { margin: 0.4em 0; }
p.header { font-weight: bold; color: #1A5276; }
"""

# Same header heuristic used by the .docx generator, kept in sync so the
# two export formats look consistent.
_HEADER_PREFIXES = (
    "أولاً", "ثانياً", "ثالثاً", "رابعاً",
    "خامساً", "سادساً", "سابعاً", "ثامناً",
    "تاسعاً", "عاشراً",
)


def _is_header(line: str) -> bool:
    return line.startswith(("─", "═")) or (
        len(line) < 60 and any(line.startswith(p) for p in _HEADER_PREFIXES)
    )


def generate_pdf(contract_text: str, title: str) -> bytes:
    """Return a .pdf file as bytes from a filled contract text string."""
    body_parts: list[str] = []
    for line in contract_text.strip().splitlines():
        line = line.strip()
        if not line:
            body_parts.append("<p>&nbsp;</p>")
            continue
        css_class = ' class="header"' if _is_header(line) else ""
        body_parts.append(f"<p{css_class}>{html.escape(line)}</p>")

    doc_html = (
        f"<html><head><style>{_STYLE}</style></head>"
        f"<body><h1>{html.escape(title)}</h1>{''.join(body_parts)}</body></html>"
    )

    story = fitz.Story(html=doc_html)
    buf = io.BytesIO()
    writer = fitz.DocumentWriter(buf)
    more = 1
    while more:
        dev = writer.begin_page(_PAGE_RECT)
        more, _ = story.place(_CONTENT_RECT)
        story.draw(dev)
        writer.end_page()
    writer.close()

    pdf_bytes = buf.getvalue()
    logger.info("pdf generated — %d bytes", len(pdf_bytes))
    return pdf_bytes
