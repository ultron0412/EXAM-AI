from __future__ import annotations

from pathlib import Path
import re
import zipfile
from xml.etree import ElementTree


MIN_USEFUL_TEXT_CHARS = 40
MIN_USEFUL_WORDS = 8


def _is_useful_text(text: str) -> bool:
    words = re.findall(r"[A-Za-z0-9]+", text)
    return len(text.strip()) >= MIN_USEFUL_TEXT_CHARS and len(words) >= MIN_USEFUL_WORDS


def _normalize_block_text(text: str) -> str:
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    return "\n".join(lines)


def _extract_with_pymupdf(path: Path) -> str:
    import fitz

    chunks: list[str] = []
    with fitz.open(str(path)) as document:
        for page in document:
            blocks = page.get_text("blocks", sort=True)
            text_blocks: list[tuple[float, float, float, str]] = []

            for block in blocks:
                x0, y0, x1, _y1, text, *_rest = block
                normalized = _normalize_block_text(text)
                if normalized:
                    text_blocks.append((round(y0, 1), round(x0, 1), x1 - x0, normalized))

            page_text = "\n".join(block[-1] for block in sorted(text_blocks))
            if page_text:
                chunks.append(page_text)

    return "\n".join(chunks).strip()


def _extract_with_pypdf2(path: Path) -> str:
    from PyPDF2 import PdfReader

    reader = PdfReader(str(path))
    chunks: list[str] = []
    for page in reader.pages:
        rotation = int(page.get("/Rotate", 0) or 0)
        candidates = [page]

        if rotation:
            rotated_page = page
            rotated_page.rotate(-rotation)
            candidates.insert(0, rotated_page)

        page_text = ""
        for candidate in candidates:
            page_text = candidate.extract_text() or ""
            if _is_useful_text(page_text):
                break

        if page_text:
            chunks.append(page_text.strip())

    return "\n".join(chunks).strip()


def _extract_text_from_docx(path: Path) -> str:
    paragraphs: list[str] = []
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}

    with zipfile.ZipFile(path) as archive:
        with archive.open("word/document.xml") as document_xml:
            root = ElementTree.parse(document_xml).getroot()

    for paragraph in root.findall(".//w:p", namespace):
        text_parts: list[str] = []
        for node in paragraph.findall(".//w:t", namespace):
            if node.text:
                text_parts.append(node.text)
        paragraph_text = "".join(text_parts).strip()
        if paragraph_text:
            paragraphs.append(paragraph_text)

    return "\n".join(paragraphs)


def extract_text_from_pdf(pdf_path: str) -> str:
    path = Path(pdf_path)
    if not path.exists():
        return ""
    suffix = path.suffix.lower()
    if suffix == ".docx":
        try:
            return _extract_text_from_docx(path)
        except Exception:
            return ""
    if suffix != ".pdf":
        try:
            return path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            return ""

    try:
        text = _extract_with_pymupdf(path)
        if _is_useful_text(text):
            return text
    except Exception:
        pass

    try:
        return _extract_with_pypdf2(path)
    except Exception:
        return ""
