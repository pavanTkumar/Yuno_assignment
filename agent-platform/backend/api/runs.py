"""Runs router — HTTP routing only. No business logic, no LangGraph imports.

Phase 1: a single SSE endpoint over the hardcoded slice spec. Phase 2 extends
this with DB-driven workflows and run-history persistence.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from core.runtime import SLICE_SPEC, stream_run
from streaming.sse import SSE_HEADERS, format_sse

router = APIRouter(prefix="/runs", tags=["runs"])


class CreateRunRequest(BaseModel):
    prompt: str
    thread_id: str | None = None


@router.post("")
async def create_run(body: CreateRunRequest) -> StreamingResponse:
    """Start a workflow run and stream typed SSE events back."""
    thread_id = body.thread_id or f"web-{uuid.uuid4().hex[:12]}"

    async def event_source() -> AsyncIterator[str]:
        async for event in stream_run(SLICE_SPEC, body.prompt, thread_id):
            yield format_sse(event)

    return StreamingResponse(
        event_source(), media_type="text/event-stream", headers=SSE_HEADERS
    )
