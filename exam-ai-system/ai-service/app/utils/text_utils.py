from __future__ import annotations

import re
from typing import Iterable

QUESTION_SPLIT_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:q(?:uestion)?\s*\d+[\).:-]|(?:\d{1,2}|[ivx]{1,6})[\).:-])\s+",
    flags=re.IGNORECASE,
)

MARKS_PATTERN = re.compile(
    r"(?:\(|\[)?\s*(\d{1,2})\s*(?:marks?|m)\s*(?:\)|\])?|(?:\(|\[)\s*(\d{1,2})\s*(?:\)|\])",
    flags=re.IGNORECASE,
)

YEAR_PATTERN = re.compile(r"(19|20)\d{2}")
QUESTION_START_PATTERN = re.compile(
    r"(?=(?:Define|Explain|Describe|Discuss|Derive|Calculate|Find|State|List|Compare|Differentiate|Draw|What|Why|How)\b)",
    flags=re.IGNORECASE,
)
NOISE_PATTERN = re.compile(
    r"(Nepal College of Information Technology|Examination|Assessment|Level|Full Marks|Pass Marks|Programme|Year/Part|Time|Subject|Candidates are required|Attempt any)",
    flags=re.IGNORECASE,
)


def clean_text(text: str) -> str:
    normalized = text.replace("\r\n", "\n").replace("\r", "\n")
    normalized = re.sub(r"[ \t]+", " ", normalized)
    normalized = re.sub(r"\n{3,}", "\n\n", normalized)
    return normalized.strip()


def tokenize_lines(text: str) -> list[str]:
    return [line.strip(" -*\t") for line in text.split("\n") if line.strip()]


def split_questions(text: str) -> list[str]:
    clean = clean_text(text)
    parts = QUESTION_SPLIT_PATTERN.split(clean)
    questions = [_normalize_question(part) for part in parts if len(part.split()) > 4]
    questions = [question for question in questions if _is_valid_question(question)]
    if questions:
        return questions[:80]

    candidates: list[str] = []
    for line in tokenize_lines(clean):
        if NOISE_PATTERN.search(line):
            continue
        segments = QUESTION_START_PATTERN.split(line)
        candidates.extend(_normalize_question(segment) for segment in segments)

    questions = [question for question in candidates if _is_valid_question(question)]
    if questions:
        return questions[:80]

    fallback = [_normalize_question(line) for line in tokenize_lines(clean) if "?" in line]
    return [question for question in fallback if _is_valid_question(question)][:80]


def _normalize_question(question: str) -> str:
    normalized = clean_text(question)
    normalized = re.sub(r"\s+", " ", normalized)
    normalized = re.sub(r"^[\s\divxIVX().:-]+", "", normalized).strip()
    return normalized


def _is_valid_question(question: str) -> bool:
    words = question.split()
    if len(words) < 4 or len(words) > 90:
        return False
    if NOISE_PATTERN.search(question) and "?" not in question:
        return False
    return bool(QUESTION_START_PATTERN.search(question) or "?" in question)


def extract_marks(question: str) -> float:
    match = MARKS_PATTERN.search(question)
    if not match:
        return infer_pokhara_marks(question)
    mark_str = match.group(1) or match.group(2)
    try:
        marks = float(mark_str)
        return marks if marks in {5.0, 7.0, 8.0} else infer_pokhara_marks(question)
    except (TypeError, ValueError):
        return infer_pokhara_marks(question)


def infer_pokhara_marks(question: str) -> float:
    low = question.lower()
    if any(word in low for word in ("derive", "calculate", "solve", "design", "prove")):
        return 8.0
    if any(word in low for word in ("explain", "discuss", "compare", "differentiate", "describe")):
        return 7.0
    return 5.0


def detect_question_type(question: str) -> str:
    low = question.lower()
    if any(word in low for word in ("short note", "short notes", "write notes", "briefly")):
        return "short_note"
    if any(word in low for word in ("derive", "proof", "show that")):
        return "derive"
    if any(word in low for word in ("calculate", "solve", "find", "numerical")):
        return "numerical"
    if any(word in low for word in ("define", "what is", "state", "list")):
        return "define"
    if any(word in low for word in ("compare", "differentiate", "discuss")):
        return "discussion"
    return "theory"


def detect_year(*values: str | None) -> int | None:
    for value in values:
        if not value:
            continue
        matches = YEAR_PATTERN.findall(value)
        if matches:
            suffix = re.search(r"(19|20)\d{2}", value)
            if suffix:
                return int(suffix.group(0))
    return None


def safe_divide(num: float, den: float) -> float:
    if den == 0:
        return 0.0
    return num / den


def average(values: Iterable[float]) -> float:
    values_list = list(values)
    if not values_list:
        return 0.0
    return sum(values_list) / len(values_list)
