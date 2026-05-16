"""SSE wire-format helper (pure)."""

from __future__ import annotations

import json

from .serializers import SSEEvent

SSE_HEADERS: dict[str, str] = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
    "Connection": "keep-alive",
}


def format_sse(event: SSEEvent) -> str:
    """Render one typed event as an SSE `event:`/`data:` frame."""
    return f"event: {event['type']}\ndata: {json.dumps(event['data'])}\n\n"
