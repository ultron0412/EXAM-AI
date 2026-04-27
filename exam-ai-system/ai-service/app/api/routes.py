from fastapi import APIRouter

from app.models.schemas import AnalyzeRequest, AnalyzeResponse, MockTestRequest, MockTestResponse
from app.services.pipeline import PredictionPipeline

router = APIRouter()
pipeline = PredictionPipeline()


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service": "ai-service"}


@router.post("/analyze", response_model=AnalyzeResponse)
def analyze(request: AnalyzeRequest) -> AnalyzeResponse:
    return pipeline.analyze(request)


@router.post("/mock-test", response_model=MockTestResponse)
def mock_test(request: MockTestRequest) -> MockTestResponse:
    return pipeline.build_mock_test(request)

