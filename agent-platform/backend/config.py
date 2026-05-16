"""Application configuration and logging setup.

Single source of truth for environment variables (pydantic-settings). No other
module may call os.getenv — import `settings` from here instead.
"""

from __future__ import annotations

import logging
import sys
from functools import lru_cache
from pathlib import Path
from typing import Literal

import structlog
from pydantic_settings import BaseSettings, SettingsConfigDict


# Repo root = backend/ -> agent-platform/ -> <root>. Resolve .env there so the
# app works regardless of the process CWD (uvicorn runs from backend/).
_ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    """Typed application settings loaded from environment / .env."""

    model_config = SettingsConfigDict(
        env_file=(_ROOT_ENV, ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # LLM — OpenAI-compatible providers, preferred in order:
    # OpenRouter (free, good tool-calling) > Groq > OpenAI.
    openrouter_api_key: str = ""
    groq_api_key: str = ""
    openai_api_key: str = ""
    # Optional explicit overrides; otherwise derived from the active provider.
    llm_base_url: str = ""
    default_model: str = ""

    @property
    def llm_provider(self) -> str:
        if self.openrouter_api_key:
            return "openrouter"
        if self.groq_api_key:
            return "groq"
        return "openai"

    @property
    def llm_api_key(self) -> str:
        return {
            "openrouter": self.openrouter_api_key,
            "groq": self.groq_api_key,
            "openai": self.openai_api_key,
        }[self.llm_provider]

    @property
    def resolved_base_url(self) -> str:
        if self.llm_base_url:
            return self.llm_base_url
        return {
            "openrouter": "https://openrouter.ai/api/v1",
            "groq": "https://api.groq.com/openai/v1",
            "openai": "https://api.openai.com/v1",
        }[self.llm_provider]

    @property
    def resolved_default_model(self) -> str:
        if self.default_model:
            return self.default_model
        return {
            # Verified working with langgraph-supervisor handoffs (Phase 1 gate).
            "openrouter": "openai/gpt-oss-120b:free",
            "groq": "llama-3.3-70b-versatile",
            "openai": "gpt-4o-mini",
        }[self.llm_provider]

    # Telegram
    telegram_bot_token: str = ""
    telegram_mode: Literal["polling", "webhook"] = "polling"
    telegram_webhook_url: str = ""

    # LangSmith
    langchain_tracing_v2: bool = False
    langchain_api_key: str = ""
    langchain_project: str = "agent-orch-platform"

    # Tools
    tavily_api_key: str = ""

    # App
    database_url: str = "sqlite+aiosqlite:///./agents.db"
    backend_url: str = "http://localhost:8000"
    frontend_url: str = "http://localhost:3000"

    @property
    def telegram_enabled(self) -> bool:
        return bool(self.telegram_bot_token)


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()


def configure_logging() -> None:
    """Configure structlog for structured, human-readable console logs."""
    logging.basicConfig(format="%(message)s", stream=sys.stdout, level=logging.INFO)
    structlog.configure(
        processors=[
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.dev.ConsoleRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )


settings: Settings = get_settings()
log: structlog.stdlib.BoundLogger = structlog.get_logger()
