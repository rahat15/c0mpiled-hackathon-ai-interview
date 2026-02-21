"""
Resume text extraction from multiple file formats + structured analysis via Groq.
"""

import io
import json
import logging
import subprocess
import tempfile
from pathlib import Path

from groq import Groq

from app.core.config import settings

logger = logging.getLogger(__name__)


# ── Format-specific extractors ───────────────────────────────────────────────

def _extract_pdf(data: bytes) -> str:
    import pdfplumber
    parts: list[str] = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                parts.append(t)
    return "\n".join(parts)


def _extract_docx(data: bytes) -> str:
    from docx import Document as DocxDoc
    doc = DocxDoc(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def _extract_doc(data: bytes) -> str:
    try:
        with tempfile.NamedTemporaryFile(suffix=".doc", delete=False) as tmp:
            tmp.write(data)
            tmp_path = tmp.name
        result = subprocess.run(["antiword", tmp_path], capture_output=True, text=True, timeout=30)
        Path(tmp_path).unlink(missing_ok=True)
        if result.returncode == 0:
            return result.stdout
    except Exception as exc:
        logger.warning("DOC extraction failed: %s", exc)
    return ""


def _extract_txt(data: bytes) -> str:
    for enc in ("utf-8", "latin-1", "cp1252"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def _extract_rtf(data: bytes) -> str:
    from striprtf.striprtf import rtf_to_text
    return rtf_to_text(data.decode("utf-8", errors="replace"))


def _extract_html(data: bytes) -> str:
    from bs4 import BeautifulSoup
    return BeautifulSoup(data, "html.parser").get_text(separator="\n", strip=True)


def _extract_odt(data: bytes) -> str:
    from odf.opendocument import load as odf_load
    from odf.text import P as OdfP
    from odf import teletype
    with tempfile.NamedTemporaryFile(suffix=".odt", delete=False) as tmp:
        tmp.write(data)
        tmp_path = tmp.name
    doc = odf_load(tmp_path)
    Path(tmp_path).unlink(missing_ok=True)
    return "\n".join(teletype.extractText(p) for p in doc.getElementsByType(OdfP))


def _extract_image(data: bytes) -> str:
    from PIL import Image
    import pytesseract
    return pytesseract.image_to_string(Image.open(io.BytesIO(data)))


_EXTRACTORS = {
    ".pdf": _extract_pdf, ".docx": _extract_docx, ".doc": _extract_doc,
    ".txt": _extract_txt, ".rtf": _extract_rtf, ".html": _extract_html,
    ".htm": _extract_html, ".odt": _extract_odt,
    ".png": _extract_image, ".jpg": _extract_image, ".jpeg": _extract_image,
    ".tiff": _extract_image, ".bmp": _extract_image, ".webp": _extract_image,
}


def extract_text(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()
    extractor = _EXTRACTORS.get(ext)
    if extractor is None:
        raise ValueError(f"Unsupported file format: {ext}")
    text = extractor(file_bytes)
    if not text or not text.strip():
        raise ValueError("Could not extract text from the uploaded file")
    return text.strip()


# ── Structured resume analysis via Groq ──────────────────────────────────────

_STRUCTURE_PROMPT = """\
Analyze the following resume and return ONLY a JSON object with these keys:
- skills: list of strings
- years_experience: integer
- leadership_signals: list of strings (empty if none)
- domains: list of industry/domain strings
- seniority_estimate: one of "junior", "mid", "senior", "lead", "executive"
- education: list of objects with "degree", "institution", "year"
- certifications: list of strings

Resume:
\"\"\"
{resume_text}
\"\"\"

Return ONLY valid JSON. No markdown, no explanation.
"""


def analyze_structure(resume_text: str) -> dict:
    """Extract structured data from resume text using Groq."""
    client = Groq(api_key=settings.GROQ_API_KEY)
    try:
        resp = client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": "You are a resume parser. Return only valid JSON."},
                {"role": "user", "content": _STRUCTURE_PROMPT.format(resume_text=resume_text[:6000])},
            ],
            temperature=0,
            response_format={"type": "json_object"},
        )
        return json.loads(resp.choices[0].message.content)
    except Exception as exc:
        logger.error("Structure analysis failed: %s", exc)
        return {"skills": [], "years_experience": 0, "leadership_signals": [],
                "domains": [], "seniority_estimate": "unknown", "education": [], "certifications": []}


# ── Simple text chunking (for retrieval later) ──────────────────────────────

def chunk_text(text: str, chunk_size: int = 500) -> list[str]:
    """Split text into chunks at sentence boundaries."""
    sentences = text.replace("\n", " ").split(". ")
    chunks: list[str] = []
    current: list[str] = []
    current_len = 0

    for s in sentences:
        s = s.strip()
        if not s:
            continue
        seg = s if s.endswith(".") else s + "."
        if current_len + len(seg) > chunk_size and current:
            chunks.append(" ".join(current))
            current = []
            current_len = 0
        current.append(seg)
        current_len += len(seg)

    if current:
        chunks.append(" ".join(current))
    return chunks if chunks else [text[:chunk_size]]
