"""Token -> USD cost estimation.

Prices are USD per 1M tokens (input, output). OpenRouter ``:free`` models are
genuinely $0 — the cost counter will correctly show $0.00 for the default
setup; that is accurate, not a bug (documented in the README).

Reasoning tokens are already folded into ``output_tokens`` by the serializer
(per CLAUDE.md's o1/o3 pitfall note), so we only price input + output here.
"""

from __future__ import annotations

# (input_per_1m, output_per_1m)
_PRICES: dict[str, tuple[float, float]] = {
    # OpenAI
    "gpt-4o": (2.50, 10.00),
    "gpt-4o-mini": (0.15, 0.60),
    # Groq
    "llama-3.3-70b-versatile": (0.59, 0.79),
    "openai/gpt-oss-20b": (0.10, 0.50),
}

_FREE_SUFFIX = ":free"


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    """USD cost for one model's token usage. Unknown / :free models = $0."""
    if model.endswith(_FREE_SUFFIX) or model not in _PRICES:
        return 0.0
    in_rate, out_rate = _PRICES[model]
    return round(
        (input_tokens / 1_000_000) * in_rate
        + (output_tokens / 1_000_000) * out_rate,
        6,
    )
