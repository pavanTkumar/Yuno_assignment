"""Chat-model factory. All LLM construction goes through here.

Backed by an OpenAI-compatible provider (OpenRouter / Groq / OpenAI), selected
in config. We keep ChatOpenAI and point it at the active provider's base URL.

Model IDs are NOT validated against a hardcoded allow-list — provider catalogs
change. An empty/falsy request falls back to the provider's default model.
"""

from __future__ import annotations

from langchain_openai import ChatOpenAI

from config import settings

# Curated picks surfaced in the agent-config UI per provider. The supervisor
# handoff pattern was verified working with the first entry of each list.
CURATED_MODELS: dict[str, tuple[str, ...]] = {
    "openrouter": (
        "openai/gpt-oss-120b:free",
        "z-ai/glm-4.5-air:free",
        "nvidia/nemotron-3-super-120b-a12b:free",
    ),
    "groq": ("llama-3.3-70b-versatile", "openai/gpt-oss-20b"),
    "openai": ("gpt-4o-mini", "gpt-4o"),
}


def supported_models() -> tuple[str, ...]:
    """Curated suggestions for the UI (not an enforced allow-list)."""
    return CURATED_MODELS.get(settings.llm_provider, ("gpt-4o-mini",))


def make_llm(model: str | None = None, *, temperature: float = 0.3) -> ChatOpenAI:
    """Build a streaming-capable chat client.

    Any non-empty model id is honored as-is; falsy falls back to the provider
    default.
    """
    chosen = model or settings.resolved_default_model
    return ChatOpenAI(
        model=chosen,
        temperature=temperature,
        api_key=settings.llm_api_key,
        base_url=settings.resolved_base_url,
        streaming=True,
    )
