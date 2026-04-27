from typing import Any

from pydantic import BaseModel, Field


class DocumentInput(BaseModel):
    id: str | None = None
    path: str | None = None
    extracted_text: str | None = None
    original_name: str | None = None
    year: int | None = None


class WeightsInput(BaseModel):
    frequency: float = 0.5
    recency: float = 0.4
    marks: float = 0.1


class AnalyzeRequest(BaseModel):
    syllabus: DocumentInput
    past_papers: list[DocumentInput] = Field(default_factory=list)
    weights: WeightsInput = Field(default_factory=WeightsInput)
    top_n: int = Field(default=30, ge=5, le=30)


class TopicScore(BaseModel):
    topic: str
    score: float


class PredictedQuestion(BaseModel):
    question: str
    explanation: str
    topic: str
    question_type: str
    marks: float
    confidence: float


class AnalyzeResponse(BaseModel):
    important_topics: list[TopicScore]
    predicted_questions: list[PredictedQuestion]
    confidence_scores: list[float]
    topic_heatmap: list[TopicScore]
    two_day_planner: list[dict[str, Any]]


class MockTestRequest(BaseModel):
    important_topics: list[TopicScore] = Field(default_factory=list)
    predicted_questions: list[PredictedQuestion] = Field(default_factory=list)
    desired_count: int = Field(default=30, ge=1, le=30)


class MockTestResponse(BaseModel):
    mock_test: list[PredictedQuestion]
