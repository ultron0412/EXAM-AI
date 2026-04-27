from __future__ import annotations

import json
import logging
import re
from typing import Any

import requests

from app.core.config import get_settings
from app.utils.text_utils import clean_text

logger = logging.getLogger(__name__)

QUESTION_VERB_PATTERN = re.compile(
    r"\b(Define|Explain|Describe|Discuss|Derive|Calculate|Find|State|List|Compare|Differentiate|Draw|What|Why|How)\b",
    flags=re.IGNORECASE,
)


def _extract_json_block(content: str) -> Any | None:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass

    code_block = re.search(r"```json\s*(\{.*?\})\s*```", content, re.DOTALL)
    if code_block:
        try:
            return json.loads(code_block.group(1))
        except json.JSONDecodeError:
            return None
    inline = re.search(r"(\{(?:.|\n)*\})", content)
    if inline:
        try:
            return json.loads(inline.group(1))
        except json.JSONDecodeError:
            return None
    return None


def _build_prompt(context: dict[str, Any], count: int) -> str:
    important_topics = context.get("important_topics", [])
    clusters = context.get("clusters", [])
    source_questions = context.get("source_questions", [])
    return (
        "You are a strict exam prediction engine. Generate only probable questions that are "
        "directly supported by BOTH the syllabus topics and the old question-paper evidence. "
        "Do not invent new topics, new chapters, new tools, new examples, or generic questions. "
        "If evidence is weak, reuse or lightly rephrase the closest old-question pattern instead "
        "of creating a new question.\n\n"
        "Return strict JSON with this shape:\n"
        "{\n"
        '  "predicted_questions": [\n'
        '    {"question": "...", "explanation": "...", "topic": "...", "question_type": "short_note|structured|long_derivation|long_numerical|long_discussion", "marks": 5}\n'
        "  ]\n"
        "}\n\n"
        "Use Pokhara University exam marking style only:\n"
        "- 5 marks: short notes, definitions, brief explanations, lists.\n"
        "- 7 marks: structured medium questions that ask explain, discuss, compare, differentiate or describe.\n"
        "- 8 marks: long analytical questions, derivations, numerical problems, design/proof questions or multi-step explanations.\n"
        "Every marks value must be exactly 5, 7 or 8. Mix all three categories where the topic supports it.\n\n"
        "Strict evidence rules:\n"
        "- Every question must be based on one of the source_questions below.\n"
        "- The topic must exactly match one of the important_topics.\n"
        "- The explanation must mention why it is probable using old-paper frequency, recency, marks or syllabus match.\n"
        "- Do not output broad study prompts like 'explain key concepts' unless that wording appears in source evidence.\n\n"
        f"Important topics:\n{json.dumps(important_topics[:12], indent=2)}\n\n"
        f"Old-question clusters:\n{json.dumps(clusters[:18], indent=2)}\n\n"
        f"Allowed source_questions:\n{json.dumps(source_questions[:30], indent=2)}\n\n"
        f"Generate exactly {count} questions."
    )


def _fallback_generated_questions(context: dict[str, Any], count: int) -> list[dict[str, Any]]:
    questions: list[dict[str, Any]] = []
    important_topics = context.get("important_topics", [])
    clusters = context.get("clusters", [])
    if not clusters:
        return []

    for idx, cluster in enumerate(clusters[:count]):
        topic = important_topics[idx % len(important_topics)]["topic"] if important_topics else "General"
        topic = cluster.get("topic") or topic
        anchor = cluster["representative_question"]
        anchor = _clean_generated_question(anchor, topic)
        marks, question_type = _pokhara_question_category(anchor, idx)
        questions.append(
            {
                "question": anchor,
                "explanation": "Selected because this pattern appears in old questions and matches a syllabus topic.",
                "topic": topic,
                "question_type": question_type,
                "marks": marks,
            }
        )
    return questions


def _pokhara_question_category(question: str, index: int = 0) -> tuple[int, str]:
    low = question.lower()
    if any(word in low for word in ("derive", "calculate", "solve", "design", "prove")):
        return 8, "long_derivation" if "derive" in low or "prove" in low else "long_numerical"
    if any(word in low for word in ("explain", "discuss", "compare", "differentiate", "describe")):
        return 7, "structured"
    if index % 5 in {0, 3}:
        return 5, "short_note"
    if index % 5 in {1, 4}:
        return 7, "structured"
    return 8, "long_discussion"


def _clean_generated_question(question: Any, topic: str = "") -> str:
    text = clean_text(str(question or ""))
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"^(?:\d+[\).:-]\s*)+", "", text).strip()

    match = QUESTION_VERB_PATTERN.search(text)
    if match:
        text = text[match.start() :].strip()

    sentences = re.split(r"(?<=[?.])\s+", text)
    selected: list[str] = []
    for sentence in sentences:
        sentence = sentence.strip()
        if not sentence:
            continue
        selected.append(sentence)
        if sentence.endswith("?") or len(" ".join(selected).split()) >= 35:
            break

    text = " ".join(selected).strip() or text
    words = text.split()
    if len(words) > 55:
        text = " ".join(words[:55]).rstrip(".,;:")
    if text and text[-1] not in ".?":
        text = f"{text}?"

    return text or f"Explain the important concepts of {topic or 'the selected topic'}."


def _build_hf_endpoint(base_url: str, model: str) -> str:
    clean_base = (base_url or "").strip().rstrip("/")
    if not clean_base:
        return f"https://api-inference.huggingface.co/models/{model}"
    if "{model}" in clean_base:
        return clean_base.replace("{model}", model)
    if clean_base.endswith("/models"):
        return f"{clean_base}/{model}"
    return clean_base


def _extract_hf_generated_text(response_json: Any) -> str:
    if isinstance(response_json, dict):
        if "error" in response_json:
            raise ValueError(str(response_json["error"]))
        if "generated_text" in response_json:
            return str(response_json["generated_text"])
        if "choices" in response_json:
            return str(response_json["choices"][0]["message"]["content"])

    if isinstance(response_json, list):
        first = response_json[0] if response_json else {}
        if isinstance(first, dict) and "generated_text" in first:
            return str(first["generated_text"])
    raise ValueError("Unsupported Hugging Face response format")


def _validate_generated_items(parsed: Any) -> list[dict[str, Any]]:
    if isinstance(parsed, list):
        items = parsed
    elif isinstance(parsed, dict):
        items = parsed.get("predicted_questions", [])
    else:
        raise ValueError("Generated response JSON has unexpected shape")
    if not isinstance(items, list) or not items:
        raise ValueError("Generated response has no predicted_questions")
    cleaned_items: list[dict[str, Any]] = []
    for idx, item in enumerate(items):
        if not isinstance(item, dict):
            continue
        topic = str(item.get("topic") or "")
        question = _clean_generated_question(item.get("question"), topic)
        marks = int(float(item.get("marks") or 0))
        question_type = str(item.get("question_type") or "")
        if marks not in {5, 7, 8}:
            marks, question_type = _pokhara_question_category(question, idx)
        elif not question_type:
            question_type = {5: "short_note", 7: "structured", 8: "long_discussion"}[marks]
        cleaned_items.append(
            {**item, "question": question, "marks": marks, "question_type": question_type}
        )
    return cleaned_items


def _generate_via_lm_studio(prompt: str, count: int) -> list[dict[str, Any]]:
    settings = get_settings()
    payload = {
        "model": settings.lm_studio_model,
        "messages": [
            {"role": "system", "content": "You are a strict evidence-based exam prediction assistant."},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.15,
        "max_tokens": 4200,
    }

    response = requests.post(
        settings.lm_studio_base_url,
        json=payload,
        timeout=settings.lm_studio_timeout_seconds,
    )
    response.raise_for_status()
    data = response.json()
    content = data["choices"][0]["message"]["content"]
    parsed = _extract_json_block(content)
    if not parsed:
        raise ValueError("LM Studio response did not include parseable JSON")
    return _validate_generated_items(parsed)[:count]


def _generate_via_huggingface(prompt: str, count: int) -> list[dict[str, Any]]:
    settings = get_settings()
    if not settings.huggingface_api_key.strip():
        raise ValueError("HUGGINGFACE_API_KEY is missing")

    endpoint = _build_hf_endpoint(settings.huggingface_api_url, settings.huggingface_model)
    headers = {
        "Authorization": f"Bearer {settings.huggingface_api_key}",
        "Content-Type": "application/json",
    }

    if "chat/completions" in endpoint:
        payload = {
            "model": settings.huggingface_model,
            "messages": [
                {"role": "system", "content": "You are a strict evidence-based exam prediction assistant."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.15,
            "max_tokens": 1800,
        }
    else:
        payload = {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": 4200,
                "temperature": 0.15,
                "return_full_text": False,
            },
        }

    response = requests.post(
        endpoint,
        headers=headers,
        json=payload,
        timeout=settings.huggingface_timeout_seconds,
    )
    response.raise_for_status()
    generated_text = _extract_hf_generated_text(response.json())
    parsed = _extract_json_block(generated_text)
    if not parsed:
        raise ValueError("Hugging Face model did not return parseable JSON")
    return _validate_generated_items(parsed)[:count]


def generate_questions(context: dict[str, Any], count: int = 12) -> list[dict[str, Any]]:
    settings = get_settings()
    prompt = _build_prompt(context=context, count=count)
    provider = settings.llm_provider.strip().lower()

    if provider == "huggingface":
        execution_order = ["huggingface", "lmstudio"]
    elif provider == "auto":
        execution_order = ["huggingface", "lmstudio"]
    else:
        execution_order = ["lmstudio", "huggingface"]

    for engine in execution_order:
        try:
            if engine == "huggingface":
                return _generate_via_huggingface(prompt=prompt, count=count)
            return _generate_via_lm_studio(prompt=prompt, count=count)
        except Exception as exc:
            logger.warning("%s generation failed: %s", engine, exc)

    logger.warning("All LLM providers failed. Falling back to heuristic generation.")
    return _fallback_generated_questions(context, count)
