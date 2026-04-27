from __future__ import annotations

from collections import Counter
from dataclasses import asdict
import importlib
import logging
from typing import Any

import numpy as np

from app.services.preprocessor import PreparedQuestion

logger = logging.getLogger(__name__)


class FeatureExtractor:
    def __init__(self, sentence_model_name: str = "all-MiniLM-L6-v2"):
        self.sentence_model_name = sentence_model_name
        self._sentence_model: Any | None = None
        self._try_load_sentence_model()

    def _try_load_sentence_model(self) -> None:
        try:
            sentence_transformers = importlib.import_module("sentence_transformers")
            SentenceTransformer = getattr(sentence_transformers, "SentenceTransformer")
            self._sentence_model = SentenceTransformer(self.sentence_model_name)
        except Exception as exc:
            logger.warning("SentenceTransformer unavailable, using TF-IDF fallback: %s", exc)
            self._sentence_model = None

    def _import_tfidf_components(self) -> tuple[Any | None, Any | None]:
        try:
            tfidf_mod = importlib.import_module("sklearn.feature_extraction.text")
            metrics_mod = importlib.import_module("sklearn.metrics.pairwise")
            return tfidf_mod.TfidfVectorizer, metrics_mod.cosine_similarity
        except Exception as exc:
            logger.warning("Scikit-learn unavailable: %s", exc)
            return None, None

    def _fallback_topics_from_questions(self, questions: list[PreparedQuestion]) -> list[str]:
        TfidfVectorizer, _ = self._import_tfidf_components()
        if TfidfVectorizer is None:
            return ["General Concepts", "Important Problems", "Theory"]

        text = " ".join(q.question for q in questions)
        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=40)
        matrix = vectorizer.fit_transform([text])
        if matrix.shape[1] == 0:
            return ["General Concepts", "Important Problems", "Theory"]
        features = vectorizer.get_feature_names_out().tolist()
        return [feat.title() for feat in features[:20]]

    def _sentence_similarity(
        self, topics: list[str], questions: list[PreparedQuestion]
    ) -> np.ndarray:
        if self._sentence_model is None:
            raise RuntimeError("Sentence model not initialized")
        _, cosine_similarity = self._import_tfidf_components()
        if cosine_similarity is None:
            raise RuntimeError("Scikit-learn not available")

        topic_embeddings = self._sentence_model.encode(topics, normalize_embeddings=True)
        question_embeddings = self._sentence_model.encode(
            [q.question for q in questions], normalize_embeddings=True
        )
        return np.asarray(cosine_similarity(question_embeddings, topic_embeddings), dtype=float)

    def _tfidf_similarity(self, topics: list[str], questions: list[PreparedQuestion]) -> np.ndarray:
        TfidfVectorizer, cosine_similarity = self._import_tfidf_components()
        if TfidfVectorizer is None or cosine_similarity is None:
            raise RuntimeError("Scikit-learn not available")

        vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2), max_features=3000)
        corpus = topics + [q.question for q in questions]
        tfidf = vectorizer.fit_transform(corpus)
        topic_matrix = tfidf[: len(topics)]
        question_matrix = tfidf[len(topics) :]
        return np.asarray(cosine_similarity(question_matrix, topic_matrix), dtype=float)

    def map_questions_to_topics(
        self, topics: list[str], questions: list[PreparedQuestion]
    ) -> dict[str, Any]:
        if not questions:
            return {
                "topics": topics,
                "questions": [],
                "topic_distribution": {},
                "question_vectors": [],
            }

        if not topics:
            topics = self._fallback_topics_from_questions(questions)

        try:
            sim = self._sentence_similarity(topics, questions)
        except Exception:
            sim = self._tfidf_similarity(topics, questions)

        enriched: list[dict[str, Any]] = []
        counter: Counter[str] = Counter()

        for idx, question in enumerate(questions):
            best_idx = int(np.argmax(sim[idx]))
            best_score = float(sim[idx][best_idx])
            topic = topics[best_idx]
            counter[topic] += 1
            data = asdict(question)
            data["topic"] = topic
            data["topic_similarity"] = best_score
            enriched.append(data)

        total = max(sum(counter.values()), 1)
        topic_distribution = {topic: count / total for topic, count in counter.items()}

        return {
            "topics": topics,
            "questions": enriched,
            "topic_distribution": topic_distribution,
            "question_vectors": sim.tolist(),
        }
