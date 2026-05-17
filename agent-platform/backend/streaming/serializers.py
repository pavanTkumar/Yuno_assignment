"""Pure functions: LangGraph astream chunks -> typed SSE event dicts.

No FastAPI / no DB imports — this module is pure and unit-testable.

With `stream_mode=["updates","messages","custom"]` and `subgraphs=True`, each
astream chunk is a FLAT 3-tuple: `(namespace: tuple[str, ...], mode: str,
payload: Any)`. (Verified empirically against langgraph 1.2.0 — the nesting
differs from single-mode streaming.)

Emitted SSE event types (the frontend store switches on these):
  node_start    — a worker/supervisor node began
  node_end      — a node finished (carries its last text)
  token         — one streamed LLM token (with the node it came from)
  agent_message — a completed inter-agent message (for the monitor drawer)
  usage         — cumulative token + USD totals
  error         — structured error (stream stays open)
  done          — terminal event
"""

from __future__ import annotations

from typing import Any, TypedDict

from langchain_core.messages import AIMessage, BaseMessage


class SSEEvent(TypedDict):
    type: str
    data: dict[str, Any]


def _node_from_namespace(namespace: tuple[str, ...]) -> str:
    """Derive the active node name from the subgraph namespace path.

    Namespace looks like ('researcher:<uuid>', 'agent:<uuid>'); the worker
    name is the segment before the first ':' of the first entry.
    """
    if not namespace:
        return "supervisor"
    return namespace[0].split(":", 1)[0]


# create_agent-internal node names that are not user-facing agents.
_INTERNAL_NODES = {"agent", "model", "tools", "__start__", "__end__"}


def serialize_updates(payload: dict[str, Any], node: str) -> list[SSEEvent]:
    """`updates` mode: {node_name: state_delta}. One node_end per real node.

    The real agent/supervisor name is the namespace head (`node`); the dict
    key is often a create_agent-internal name (agent/model/tools) which we
    don't surface to the canvas.
    """
    events: list[SSEEvent] = []
    for name, delta in payload.items():
        real = name if name not in _INTERNAL_NODES else node
        if real in _INTERNAL_NODES:
            continue
        text = ""
        msgs = (delta or {}).get("messages") if isinstance(delta, dict) else None
        if msgs:
            text = _message_text(msgs[-1])
        # `agent_message` carries the complete, correctly-attributed output of
        # one agent step — reliable even when the sub-agent doesn't token-
        # stream. The frontend builds the transcript from these.
        if text.strip():
            events.append(
                {"type": "agent_message", "data": {"node": real, "text": text}}
            )
        events.append(
            {"type": "node_end", "data": {"node": real, "text": text}}
        )
    return events


def serialize_messages(
    payload: tuple[BaseMessage, dict[str, Any]], namespace: tuple[str, ...]
) -> list[SSEEvent]:
    """`messages` mode: (message_chunk, metadata). Stream tokens + usage.

    Tokens are emitted ONLY from a real agent subgraph (non-empty namespace
    like ('researcher:..',)). The top-level empty-namespace re-emission is the
    supervisor echoing the worker's text — skipping it removes the duplicate
    while still counting its usage.
    """
    msg, meta = payload
    events: list[SSEEvent] = []
    content = _message_text(msg)

    if content and namespace:
        node = namespace[0].split(":", 1)[0]
        events.append({"type": "token", "data": {"node": node, "text": content}})

    usage = _usage_from_message(msg)
    if usage:
        events.append({"type": "usage", "data": usage})
    return events


def serialize_custom(payload: Any, node: str) -> list[SSEEvent]:  # noqa: ANN401 — opaque user payload
    """`custom` mode: anything emitted via get_stream_writer()."""
    return [{"type": "custom", "data": {"node": node, "payload": payload}}]


def serialize_chunk(chunk: Any) -> list[SSEEvent]:  # noqa: ANN401 — heterogeneous stream
    """Dispatch one raw astream chunk to the right serializer."""
    if not isinstance(chunk, tuple):
        return []

    # subgraphs=True + multiple modes -> flat (namespace, mode, payload).
    if len(chunk) == 3 and isinstance(chunk[0], tuple) and isinstance(chunk[1], str):
        namespace, mode, payload = chunk
    # single-mode / no-subgraph fallback -> (mode, payload).
    elif len(chunk) == 2 and isinstance(chunk[0], str):
        namespace, mode, payload = (), chunk[0], chunk[1]
    else:
        return []

    node = _node_from_namespace(namespace)

    if mode == "updates":
        return serialize_updates(payload, node)
    if mode == "messages":
        return serialize_messages(payload, namespace)
    if mode == "custom":
        return serialize_custom(payload, node)
    return []


def _message_text(msg: object) -> str:
    """Extract plain text from a (possibly chunked) LangChain message."""
    content = getattr(msg, "content", None)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = [
            p.get("text", "")
            for p in content
            if isinstance(p, dict) and p.get("type") == "text"
        ]
        return "".join(parts)
    return ""


def _usage_from_message(msg: object) -> dict[str, Any] | None:
    """Pull token usage off an AIMessage, including reasoning tokens."""
    if not isinstance(msg, AIMessage):
        return None
    usage = getattr(msg, "usage_metadata", None)
    if not usage:
        return None
    output = int(usage.get("output_tokens", 0))
    details = usage.get("output_token_details") or {}
    reasoning = int(details.get("reasoning", 0) or details.get("reasoning_tokens", 0))
    input_tokens = int(usage.get("input_tokens", 0))
    return {
        "input_tokens": input_tokens,
        "output_tokens": output + reasoning,
        "total_tokens": input_tokens + output + reasoning,
    }
