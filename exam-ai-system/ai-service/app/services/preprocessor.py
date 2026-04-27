from __future__ import annotations

from dataclasses import dataclass
import re
from typing import Any

import nltk

from app.models.schemas import DocumentInput
from app.services.pdf_parser import extract_text_from_pdf
from app.utils.text_utils import clean_text, detect_question_type, extract_marks, split_questions


def _ensure_nltk_resources() -> None:
    try:
        nltk.data.find("tokenizers/punkt")
    except LookupError:
        nltk.download("punkt", quiet=True)


@dataclass
class PreparedQuestion:
    question: str
    marks: float
    question_type: str
    year: int | None
    source_doc_id: str | None
    source_name: str | None


class Preprocessor:
    def __init__(self, max_text_chars: int = 120_000):
        self.max_text_chars = max_text_chars
        _ensure_nltk_resources()

    def load_document_text(self, document: DocumentInput) -> str:
        if document.extracted_text and document.extracted_text.strip():
            return clean_text(document.extracted_text[: self.max_text_chars])
        if document.path:
            parsed = extract_text_from_pdf(document.path)
            return clean_text(parsed[: self.max_text_chars])
        return ""

    def extract_syllabus_topics(self, syllabus_text: str) -> list[str]:
        lines = [line.strip() for line in syllabus_text.split("\n") if line.strip()]
        heading_candidates: list[str] = []
        for line in lines:
            stripped = re.sub(r"^\d+[\).:-]\s*", "", line)
            word_count = len(stripped.split())
            if 2 <= word_count <= 10:
                heading_candidates.append(stripped)

        if not heading_candidates:
            tokens = [w for w in nltk.word_tokenize(syllabus_text) if w.isalpha()]
            chunks = [" ".join(tokens[idx : idx + 3]) for idx in range(0, len(tokens), 3)]
            heading_candidates = [chunk for chunk in chunks if len(chunk.split()) >= 2]

        deduped: list[str] = []
        seen: set[str] = set()
        for topic in heading_candidates:
            normalized = topic.lower()
            if normalized in seen:
                continue
            seen.add(normalized)
            deduped.append(topic)

        return deduped[:60]

    def parse_paper_questions(self, papers: list[DocumentInput]) -> list[PreparedQuestion]:
        all_questions: list[PreparedQuestion] = []
        for paper in papers:
            text = self.load_document_text(paper)
            if not text:
                continue
            for question in split_questions(text):
                all_questions.append(
                    PreparedQuestion(
                        question=question,
                        marks=extract_marks(question),
                        question_type=detect_question_type(question),
                        year=paper.year,
                        source_doc_id=paper.id,
                        source_name=paper.original_name,
                    )
                )
        return all_questions

    def prepare(self, syllabus: DocumentInput, papers: list[DocumentInput]) -> dict[str, Any]:
        syllabus_text = self.load_document_text(syllabus)
        topics = self.extract_syllabus_topics(syllabus_text)
        questions = self.parse_paper_questions(papers)
        return {
            "syllabus_text": syllabus_text,
            "topics": topics,
            "questions": questions,
        }

