# app/config/settings.py

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


class Settings(BaseSettings):
    """Application settings with environment-based configuration."""

    # App
    APP_NAME: str = "Lawyer App"
    DEBUG: bool = False

    # API
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # Qdrant
    QDRANT_URL: str
    QDRANT_API_KEY: str
    COLLECTION_NAME: str = "egypt_law"

    # Models
    DENSE_MODEL: str

    # OpenAI
    OPENAI_API_KEY: str
    OPENAI_MODEL: str = "gpt-4o"

    # Retrieval
    PREFETCH_K: int = 20
    TOP_K: int = 8

    model_config = SettingsConfigDict(
        env_file=Path(__file__).parent.parent.parent / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    """Cached settings instance — loads once per process."""
    return Settings()
