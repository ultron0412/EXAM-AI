from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ai_service_host: str = "0.0.0.0"
    ai_service_port: int = 8000
    llm_provider: str = "lmstudio"
    lm_studio_base_url: str = "http://localhost:1234/v1/chat/completions"
    lm_studio_model: str = "mistral-7b-instruct"
    lm_studio_timeout_seconds: int = 90
    huggingface_api_key: str = ""
    huggingface_model: str = "mistralai/Mistral-7B-Instruct-v0.3"
    huggingface_api_url: str = "https://api-inference.huggingface.co/models"
    huggingface_timeout_seconds: int = 120
    sentence_transformer_model: str = "all-MiniLM-L6-v2"
    document_ai_enabled: bool = True
    document_ai_model: str = "naver-clova-ix/donut-base-finetuned-docvqa"
    document_ai_prompt: str = (
        "<s_docvqa><s_question>What text is written in this exam document?</s_question><s_answer>"
    )
    document_ai_max_pages: int = 3
    document_ai_max_length: int = 768
    max_text_chars: int = 120_000
    default_top_n: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8-sig",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
