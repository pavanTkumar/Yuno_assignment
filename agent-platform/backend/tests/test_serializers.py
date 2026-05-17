"""Pure serializer + cost tests (no app, no LLM)."""

from __future__ import annotations

from langchain_core.messages import AIMessage

from core.cost import estimate_cost
from streaming.serializers import serialize_chunk


def test_messages_chunk_emits_token_with_real_node() -> None:
    chunk = (
        ("researcher:abc",),
        "messages",
        (AIMessage(content="hi"), {"langgraph_node": "model"}),
    )
    events = serialize_chunk(chunk)
    assert {"type": "token", "data": {"node": "researcher", "text": "hi"}} in events


def test_empty_namespace_token_is_suppressed() -> None:
    # Top-level re-emission (supervisor echo) must not duplicate tokens.
    chunk = ((), "messages", (AIMessage(content="echo"), {}))
    assert all(e["type"] != "token" for e in serialize_chunk(chunk))


def test_updates_emits_agent_message_and_node_end() -> None:
    chunk = (
        (),
        "updates",
        {"researcher": {"messages": [AIMessage(content="notes")]}},
    )
    events = serialize_chunk(chunk)
    types = {e["type"] for e in events}
    assert "agent_message" in types
    assert "node_end" in types


def test_internal_node_name_remapped_to_real_node() -> None:
    # An internal key ('agent') under a real namespace is remapped to that
    # agent, never surfaced as the internal name.
    chunk = (
        ("writer:xyz",),
        "updates",
        {"agent": {"messages": [AIMessage(content="x")]}},
    )
    nodes = {e["data"]["node"] for e in serialize_chunk(chunk)}
    assert nodes == {"writer"}
    assert "agent" not in nodes


def test_cost_free_model_is_zero() -> None:
    assert estimate_cost("openai/gpt-oss-120b:free", 1000, 1000) == 0.0


def test_cost_known_model() -> None:
    # gpt-4o-mini: 0.15 / 0.60 per 1M
    cost = estimate_cost("gpt-4o-mini", 1_000_000, 1_000_000)
    assert cost == round(0.15 + 0.60, 6)
