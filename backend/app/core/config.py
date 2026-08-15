from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Budget Tracker"
    ENV: str = "development"

    DATABASE_URL: str = "sqlite:///./data/app.db"

    SECRET_KEY: str = "change-me-in-production-please"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 12
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30
    JWT_ALGORITHM: str = "HS256"

    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    # LLM provider: "local" (self-hosted, OpenAI-compatible endpoint, e.g. Ollama) or
    # "claude" (Anthropic API — data leaves the host machine; see README for the tradeoff).
    LLM_ENABLED: bool = True
    LLM_PROVIDER: str = "local"
    LLM_TIMEOUT_SECONDS: float = 15.0

    # Local LLM (OpenAI-compatible endpoint, e.g. Ollama's /v1)
    LLM_BASE_URL: str = "http://localhost:11434/v1"
    LLM_MODEL: str = "llama3.1"
    LLM_API_KEY: str = "not-needed"

    # Claude API (used when LLM_PROVIDER=claude)
    ANTHROPIC_API_KEY: str = ""
    ANTHROPIC_MODEL: str = "claude-sonnet-5"

    # Weekly/monthly recaps + daily nudge evaluation. Off by default under pytest; set
    # explicitly in .env for a real deployment. Disable if you don't want background jobs
    # (e.g. multiple `--reload` workers) — the /recaps/generate and /nudges/generate
    # endpoints still work manually either way.
    SCHEDULER_ENABLED: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
