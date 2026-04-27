import logging

from fastapi import FastAPI

from app.api.routes import router as api_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)

app = FastAPI(
    title="Exam AI Service",
    version="1.0.0",
    description="NLP and pluggable LLM service (LM Studio/Hugging Face) for exam question prediction",
)

app.include_router(api_router)
