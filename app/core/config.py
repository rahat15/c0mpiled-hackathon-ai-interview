"""
Application configuration — loaded from environment / .env file.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "AI Interview Platform"
    DEBUG: bool = False

    # ── Groq (single LLM for everything) ─────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.1-8b-instant"

    # ── JWT ───────────────────────────────────────────────
    JWT_SECRET: str = "change-this-to-a-secure-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 1440

    # ── Interview stage question limits ───────────────────
    STAGE_LIMITS_INTRO: int = 3
    STAGE_LIMITS_TECHNICAL: int = 8
    STAGE_LIMITS_DEEP_DIVE: int = 5
    STAGE_LIMITS_BEHAVIORAL: int = 5
    STAGE_LIMITS_CLOSING: int = 2

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()
