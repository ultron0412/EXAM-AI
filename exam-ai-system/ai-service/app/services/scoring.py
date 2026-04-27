from __future__ import annotations

from collections import defaultdict
from typing import Any

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.utils.text_utils import average, safe_divide


class ScoringEngine:
    def __init__(self, frequency_weight: float, recency_weight: float, marks_weight: float):
        self.frequency_weight = frequency_weight
        self.recency_weight = recency_weight
        self.marks_weight = marks_weight

    def _topic_year_score(self, years: list[int]) -> float:
        if not years:
            return 0.0
        year_min = min(years)
        year_max = max(years)
        if year_min == year_max:
            return 1.0
        normalized = [(year - year_min) / (year_max - year_min) for year in years]
        return average(normalized)

    def score_topics(self, questions: list[dict[str, Any]]) -> list[dict[str, float]]:
        grouped: dict[str, dict[str, list[float]]] = defaultdict(
            lambda: {"marks": [], "years": [], "sims": []}
        )
        for q in questions:
            topic = q.get("topic", "General")
            grouped[topic]["marks"].append(float(q.get("marks", 0)))
            if isinstance(q.get("year"), int):
                grouped[topic]["years"].append(int(q["year"]))
            grouped[topic]["sims"].append(float(q.get("topic_similarity", 0)))

        max_freq = max((len(values["marks"]) for values in grouped.values()), default=1)
        max_marks = max((max(values["marks"]) for values in grouped.values() if values["marks"]), default=10)

        topic_scores: list[dict[str, float]] = []
        for topic, values in grouped.items():
            frequency_score = safe_divide(len(values["marks"]), max_freq)
            recency_score = self._topic_year_score(values["years"])
            marks_score = safe_divide(average(values["marks"]), max_marks)
            semantic_score = average(values["sims"])

            final = (
                self.frequency_weight * frequency_score
                + self.recency_weight * recency_score
                + self.marks_weight * marks_score
            )
            final = 0.8 * final + 0.2 * semantic_score

            topic_scores.append({"topic": topic, "score": float(round(final, 4))})

        topic_scores.sort(key=lambda item: item["score"], reverse=True)
        return topic_scores

    def build_clusters(self, questions: list[dict[str, Any]]) -> list[dict[str, Any]]:
        if not questions:
            return []
        texts = [q["question"] for q in questions]
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=1500)
        matrix = vectorizer.fit_transform(texts)
        similarity = cosine_similarity(matrix)

        clusters: list[dict[str, Any]] = []
        visited: set[int] = set()
        threshold = 0.5
        for i, question in enumerate(questions):
            if i in visited:
                continue
            member_indices = [idx for idx, sim in enumerate(similarity[i]) if sim >= threshold]
            for idx in member_indices:
                visited.add(idx)
            member_questions = [questions[idx] for idx in member_indices]
            confidence = float(
                round(
                    average(
                        [
                            float(item.get("topic_similarity", 0)) * 0.6
                            + safe_divide(float(item.get("marks", 0)), 20) * 0.4
                            for item in member_questions
                        ]
                    ),
                    4,
                )
            )
            clusters.append(
                {
                    "topic": question.get("topic", "General"),
                    "representative_question": question["question"],
                    "questions": member_questions,
                    "confidence": confidence,
                }
            )
        clusters.sort(key=lambda c: c["confidence"], reverse=True)
        return clusters

