from __future__ import annotations

from typing import Any
import re

from app.core.config import get_settings
from app.models.schemas import AnalyzeRequest, AnalyzeResponse, MockTestRequest, MockTestResponse
from app.services.feature_extractor import FeatureExtractor
from app.services.lmstudio_client import generate_questions
from app.services.preprocessor import Preprocessor
from app.services.scoring import ScoringEngine
from app.utils.text_utils import average


class PredictionPipeline:
    def __init__(self):
        settings = get_settings()
        self.preprocessor = Preprocessor(max_text_chars=settings.max_text_chars)
        self.feature_extractor = FeatureExtractor(
            sentence_model_name=settings.sentence_transformer_model
        )

    def analyze(self, request: AnalyzeRequest) -> AnalyzeResponse:
        prepared = self.preprocessor.prepare(request.syllabus, request.past_papers)
        mapped = self.feature_extractor.map_questions_to_topics(
            prepared["topics"], prepared["questions"]
        )

        scorer = ScoringEngine(
            frequency_weight=request.weights.frequency,
            recency_weight=request.weights.recency,
            marks_weight=request.weights.marks,
        )

        topic_scores = scorer.score_topics(mapped["questions"])
        clusters = scorer.build_clusters(mapped["questions"])

        strict_clusters = self._strict_evidence_clusters(clusters, request.top_n)
        context = {
            "important_topics": topic_scores,
            "clusters": strict_clusters,
            "source_questions": self._source_question_evidence(strict_clusters, request.top_n),
        }
        generated = generate_questions(context=context, count=request.top_n)
        generated_questions = self._normalize_generated_questions(
            generated=generated, topic_scores=topic_scores, clusters=strict_clusters
        )

        confidence_scores = [q["confidence"] for q in generated_questions]
        topic_heatmap = topic_scores[:20]

        return AnalyzeResponse(
            important_topics=topic_scores[:20],
            predicted_questions=generated_questions[: request.top_n],
            confidence_scores=confidence_scores[: request.top_n],
            topic_heatmap=topic_heatmap,
            two_day_planner=self._build_three_day_planner(topic_scores),
        )

    def build_mock_test(self, request: MockTestRequest) -> MockTestResponse:
        sorted_questions = sorted(
            request.predicted_questions,
            key=lambda item: float(item.confidence),
            reverse=True,
        )
        selected = sorted_questions[: request.desired_count]
        return MockTestResponse(mock_test=selected)

    def _normalize_generated_questions(
        self, generated: list[dict[str, Any]], topic_scores: list[dict[str, float]], clusters: list[dict[str, Any]]
    ) -> list[dict[str, Any]]:
        topic_score_map = {item["topic"]: item["score"] for item in topic_scores}
        allowed_topics = set(topic_score_map)

        normalized: list[dict[str, Any]] = []
        seen_questions: set[str] = set()
        for idx, item in enumerate(generated):
            topic = item.get("topic") or (
                topic_scores[idx % len(topic_scores)]["topic"] if topic_scores else "General"
            )
            if allowed_topics and topic not in allowed_topics:
                topic = topic_scores[0]["topic"]

            matched_cluster = self._best_matching_cluster(item.get("question", ""), topic, clusters)
            evidence_question = matched_cluster.get("representative_question", item.get("question", ""))
            question = item.get("question") if matched_cluster.get("match_score", 0) >= 0.22 else evidence_question
            question = self._clean_question_for_output(question)
            if not question or question.lower() in seen_questions:
                continue
            seen_questions.add(question.lower())

            marks = float(item.get("marks") or matched_cluster.get("marks") or 5)
            confidence = (
                float(topic_score_map.get(topic, 0.5)) * 0.55
                + float(matched_cluster.get("confidence", 0.35)) * 0.45
            )
            normalized_item = {
                "question": question,
                "explanation": item.get("explanation")
                or "Selected because it matches repeated old-question evidence and the syllabus.",
                "topic": topic,
                "question_type": item.get("question_type", "theory"),
                "marks": marks,
                "confidence": round(min(max(confidence, 0.0), 0.99), 4),
            }
            normalized.append(normalized_item)

        if len(normalized) < len(clusters):
            for cluster in clusters:
                question = self._clean_question_for_output(cluster.get("representative_question", ""))
                if not question or question.lower() in seen_questions:
                    continue
                seen_questions.add(question.lower())
                topic = cluster.get("topic", topic_scores[0]["topic"] if topic_scores else "General")
                normalized.append(
                    {
                        "question": question,
                        "explanation": "Selected directly from old-question evidence matched with the syllabus.",
                        "topic": topic,
                        "question_type": "theory",
                        "marks": float(cluster.get("marks") or 5),
                        "confidence": round(
                            min(
                                max(
                                    float(topic_score_map.get(topic, 0.5)) * 0.55
                                    + float(cluster.get("confidence", 0.35)) * 0.45,
                                    0.0,
                                ),
                                0.99,
                            ),
                            4,
                        ),
                    }
                )

        normalized.sort(key=lambda item: item["confidence"], reverse=True)
        return normalized

    def _strict_evidence_clusters(
        self, clusters: list[dict[str, Any]], requested_count: int
    ) -> list[dict[str, Any]]:
        ranked = sorted(
            clusters,
            key=lambda item: (
                float(item.get("confidence", 0)),
                len(item.get("questions", [])),
            ),
            reverse=True,
        )
        return ranked[: max(requested_count, 30)]

    def _source_question_evidence(
        self, clusters: list[dict[str, Any]], requested_count: int
    ) -> list[dict[str, Any]]:
        evidence: list[dict[str, Any]] = []
        for cluster in clusters[: max(requested_count, 30)]:
            members = cluster.get("questions", [])
            years = sorted(
                {
                    item.get("year")
                    for item in members
                    if isinstance(item.get("year"), int)
                }
            )
            marks_values = [
                float(item.get("marks", 0))
                for item in members
                if float(item.get("marks", 0) or 0) > 0
            ]
            evidence.append(
                {
                    "topic": cluster.get("topic", "General"),
                    "question": cluster.get("representative_question", ""),
                    "frequency": len(members),
                    "years": years,
                    "marks": round(average(marks_values), 2) if marks_values else None,
                    "confidence": cluster.get("confidence", 0),
                }
            )
        return evidence

    def _best_matching_cluster(
        self, question: str, topic: str, clusters: list[dict[str, Any]]
    ) -> dict[str, Any]:
        if not clusters:
            return {}
        question_tokens = self._tokens(question)
        best = clusters[0]
        best_score = -1.0
        for cluster in clusters:
            cluster_tokens = self._tokens(cluster.get("representative_question", ""))
            overlap = (
                len(question_tokens & cluster_tokens) / max(len(question_tokens | cluster_tokens), 1)
            )
            topic_bonus = 0.15 if cluster.get("topic") == topic else 0.0
            score = overlap + topic_bonus + float(cluster.get("confidence", 0)) * 0.1
            if score > best_score:
                best = cluster
                best_score = score
        return {**best, "match_score": best_score}

    def _tokens(self, text: str) -> set[str]:
        return {
            token
            for token in re.findall(r"[a-zA-Z][a-zA-Z0-9_]+", str(text).lower())
            if len(token) > 2
        }

    def _clean_question_for_output(self, question: str) -> str:
        cleaned = re.sub(r"\s+", " ", str(question or "")).strip()
        cleaned = re.sub(r"^(?:\d+[\).:-]\s*)+", "", cleaned).strip()
        words = cleaned.split()
        if len(words) > 60:
            cleaned = " ".join(words[:60]).rstrip(".,;:")
        if cleaned and cleaned[-1] not in ".?":
            cleaned = f"{cleaned}?"
        return cleaned

    def _build_three_day_planner(self, topic_scores: list[dict[str, float]]) -> list[dict[str, Any]]:
        topics = [item["topic"] for item in topic_scores[:15]]
        return [
            {
                "day": 1,
                "topics": topics[0:5],
                "targetHours": 6,
                "notes": "Build core concepts, formulas and definitions from the highest-priority topics.",
            },
            {
                "day": 2,
                "topics": topics[5:10],
                "targetHours": 6,
                "notes": "Practice numerical, derivation and long-form questions from repeated topics.",
            },
            {
                "day": 3,
                "topics": topics[10:15],
                "targetHours": 6,
                "notes": "Revise weak areas, solve a timed mock test and review likely short questions.",
            },
        ]
