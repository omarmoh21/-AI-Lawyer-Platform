"""Generate a formatted, right-to-left Arabic .docx from a filled contract string.

Arabic is a "complex script" in Word, and right-to-left is set at three levels
— all three are needed for Word to treat this as a genuine Arabic document,
not just Arabic text sitting in an LTR page:
  - Section (w:sectPr/w:bidi)  — the page itself is RTL: margins, and the
    "Right-to-left document" checkbox Word shows under Layout, follow this.
  - Paragraph (w:pPr/w:bidi)   — each paragraph's line direction and the
    default alignment side (RIGHT is genuinely "start" only under RTL).
  - Run (w:rPr/w:rtl + w:cs*)  — the complex-script font (w:cs) and complex-
    script size (w:szCs, since plain w:sz only sizes Latin text) that Word
    uses to shape Arabic glyphs, plus the run's own rtl/cs flags.

CT_PPr and CT_RPr are ordered sequences in the OOXML schema (ECMA-376 §17.3):
w:bidi must precede w:jc in a paragraph's properties, and w:bCs/w:szCs/w:rtl/
w:cs must sit in a specific order relative to w:b/w:sz within a run's
properties. python-docx's high-level setters (paragraph.alignment, run.bold,
run.font.size, ...) don't know about our custom bidi/cs elements, so mixing
them with plain `.append()` calls silently produces out-of-order XML. Word
tolerates a lot, but on some documents it "repairs" (silently drops or
reorders) elements that are out of sequence — which looks exactly like RTL
"not working" even though the tag was technically present in the file. To
avoid that entirely, every property below is built from scratch in one shot,
in the exact schema order, rather than layered on top of python-docx's setters.
"""

import io
import logging

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor

logger = logging.getLogger(__name__)

# Widely installed on Windows/macOS and renders Arabic cleanly, so the exported
# file looks right without depending on a font the reader may not have.
ARABIC_FONT = "Arial"
HEADING_COLOR = "1A5276"  # dark blue, as a hex string (w:color val expects hex)

_HEADING_PREFIXES = (
    "أولاً", "ثانياً", "ثالثاً", "رابعاً", "خامساً",
    "سادساً", "سابعاً", "ثامناً", "تاسعاً", "عاشراً",
)


def _set_paragraph_props(paragraph, *, align: str | None = None) -> None:
    """Build this paragraph's w:pPr from scratch, in correct schema order:
    w:bidi, then (optionally) w:jc. (CT_PPr sequence: ... bidi ... jc ...)

    For plain RTL body text we deliberately emit NO w:jc: a bidi paragraph's
    default justification is "start", which is the RIGHT edge under RTL — and
    that is honored consistently by Word, LibreOffice, and Google Docs. An
    explicit w:jc="right" is NOT portable here: Word treats it as visual-right,
    but LibreOffice/Google-style renderers treat left/right in a bidi paragraph
    as logical start/end, so "right" flips to the visual LEFT. Only pass align
    for genuinely direction-neutral cases like "center".
    """
    p = paragraph._p
    old_pPr = p.find(qn("w:pPr"))
    if old_pPr is not None:
        p.remove(old_pPr)

    pPr = OxmlElement("w:pPr")
    pPr.append(OxmlElement("w:bidi"))

    if align is not None:
        jc = OxmlElement("w:jc")
        jc.set(qn("w:val"), align)
        pPr.append(jc)

    p.insert(0, pPr)  # w:pPr must be the paragraph's first child


def _set_section_rtl(section) -> None:
    """Flag the section itself as RTL — this is what makes Word treat the
    whole page as an Arabic page (Layout ▸ Right-to-left document) rather
    than an LTR page that merely contains RTL paragraphs."""
    sectPr = section._sectPr
    if sectPr.find(qn("w:bidi")) is None:
        # w:bidi is one of the last children of CT_SectPr; appending is safe
        # here since we don't set any of the (even later) page-numbering /
        # section-type properties that would need to follow it.
        sectPr.append(OxmlElement("w:bidi"))


def _set_doc_defaults_rtl(doc) -> None:
    """Set the Normal style's default run/paragraph properties to Arabic +
    RTL, so anything that ever falls back to document defaults (e.g. a run
    added without explicit styling) still renders as Arabic, not Latin LTR."""
    doc_defaults = doc.styles.element.find(qn("w:docDefaults"))
    if doc_defaults is None:
        return

    rPrDefault = doc_defaults.find(qn("w:rPrDefault"))
    if rPrDefault is not None:
        for old in rPrDefault.findall(qn("w:rPr")):
            rPrDefault.remove(old)
        rPr = OxmlElement("w:rPr")
        rPr.append(_rfonts_element())
        rtl = OxmlElement("w:rtl")
        rtl.set(qn("w:val"), "1")
        rPr.append(rtl)
        cs = OxmlElement("w:cs")
        cs.set(qn("w:val"), "1")
        rPr.append(cs)
        rPrDefault.append(rPr)

    pPrDefault = doc_defaults.find(qn("w:pPrDefault"))
    if pPrDefault is not None:
        for old in pPrDefault.findall(qn("w:pPr")):
            pPrDefault.remove(old)
        pPr = OxmlElement("w:pPr")
        pPr.append(OxmlElement("w:bidi"))
        pPrDefault.append(pPr)


def _rfonts_element():
    rFonts = OxmlElement("w:rFonts")
    rFonts.set(qn("w:ascii"), ARABIC_FONT)
    rFonts.set(qn("w:hAnsi"), ARABIC_FONT)
    rFonts.set(qn("w:cs"), ARABIC_FONT)  # the complex-script font — shapes the Arabic glyphs
    return rFonts


def _add_arabic_run(paragraph, text: str, size_pt: float, *, bold: bool = False, color: str | None = None):
    """Add a run with its w:rPr built from scratch, in correct schema order:
    w:rFonts, w:b, w:bCs, w:color, w:sz, w:szCs, w:rtl, w:cs.
    (CT_RPr sequence: rFonts ... b, bCs ... color ... sz, szCs ... rtl, cs ...)"""
    run = paragraph.add_run(text)
    r = run._r
    old_rPr = r.find(qn("w:rPr"))
    if old_rPr is not None:
        r.remove(old_rPr)

    rPr = OxmlElement("w:rPr")
    rPr.append(_rfonts_element())

    if bold:
        rPr.append(OxmlElement("w:b"))
        rPr.append(OxmlElement("w:bCs"))

    if color is not None:
        c = OxmlElement("w:color")
        c.set(qn("w:val"), color)
        rPr.append(c)

    half_points = str(int(size_pt * 2))
    sz = OxmlElement("w:sz")
    sz.set(qn("w:val"), half_points)
    rPr.append(sz)
    szCs = OxmlElement("w:szCs")  # complex-script size — w:sz alone is ignored for Arabic text
    szCs.set(qn("w:val"), half_points)
    rPr.append(szCs)

    rtl = OxmlElement("w:rtl")
    rtl.set(qn("w:val"), "1")
    rPr.append(rtl)
    cs = OxmlElement("w:cs")  # marks the run as complex-script so Word applies w:rFonts[w:cs]/szCs
    cs.set(qn("w:val"), "1")
    rPr.append(cs)

    r.insert(0, rPr)  # w:rPr must be the run's first child
    return run


def _is_heading(line: str) -> bool:
    return line.startswith(("─", "═")) or (
        len(line) < 60 and any(line.startswith(p) for p in _HEADING_PREFIXES)
    )


def generate_docx(contract_text: str, title: str) -> bytes:
    """Return a right-to-left Arabic .docx as bytes from a filled contract text."""
    doc = Document()
    _set_doc_defaults_rtl(doc)

    for section in doc.sections:
        section.top_margin = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin = Inches(1.2)
        section.right_margin = Inches(1.2)
        _set_section_rtl(section)

    # ── Title (centered, RTL) ──────────────────────────────────
    title_para = doc.add_paragraph()
    _set_paragraph_props(title_para, align="center")
    _add_arabic_run(title_para, title, 16, bold=True, color=HEADING_COLOR)

    doc.add_paragraph()  # spacer

    # ── Body lines ─────────────────────────────────────────────
    for raw in contract_text.strip().splitlines():
        line = raw.strip()
        if not line:
            doc.add_paragraph()
            continue

        para = doc.add_paragraph()
        heading = _is_heading(line)
        _set_paragraph_props(para)  # no jc → natural RTL start (right edge)
        _add_arabic_run(
            para, line, 12, bold=heading, color=HEADING_COLOR if heading else None
        )

    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    logger.info("docx generated — %d bytes", buf.getbuffer().nbytes)
    return buf.read()
