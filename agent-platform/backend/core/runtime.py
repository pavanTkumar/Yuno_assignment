"""Graph runtime: owns the shared checkpointer and streams runs as SSE events.

This is the only place that drives `graph.astream`. The API layer calls
`stream_run` and forwards the typed events — it never imports LangGraph.
"""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from langchain_core.messages import HumanMessage
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver

from config import log, settings
from core.supervisor import RESEARCH_WRITE_SLICE, WorkflowSpec, build_supervisor
from streaming.serializers import SSEEvent, serialize_chunk

# AsyncSqliteSaver is an async context manager; hold it open for the app's life.
_CHECKPOINT_DB = settings.database_url.replace("sqlite+aiosqlite:///", "")
_saver_cm: AsyncSqliteSaver | None = None
_saver: AsyncSqliteSaver | None = None


@asynccontextmanager
async def checkpointer_lifespan() -> AsyncIterator[None]:
    """Open the shared AsyncSqliteSaver for the application's lifetime."""
    global _saver_cm, _saver
    _saver_cm = AsyncSqliteSaver.from_conn_string(_CHECKPOINT_DB)
    _saver = await _saver_cm.__aenter__()
    log.info("checkpointer.opened", db=_CHECKPOINT_DB)
    try:
        yield
    finally:
        await _saver_cm.__aexit__(None, None, None)
        log.info("checkpointer.closed")


def get_checkpointer() -> AsyncSqliteSaver:
    if _saver is None:
        raise RuntimeError("Checkpointer not initialized — use checkpointer_lifespan")
    return _saver


async def stream_run(
    spec: WorkflowSpec, prompt: str, thread_id: str
) -> AsyncIterator[SSEEvent]:
    """Run a workflow and yield typed SSE events.

    Errors are emitted as a structured `error` event — the stream is never
    dropped mid-flight (per CLAUDE.md streaming rule).
    """
    try:
        graph = build_supervisor(spec, get_checkpointer())
        config = {"configurable": {"thread_id": thread_id}}
        yield {"type": "node_start", "data": {"node": "supervisor"}}
        async for chunk in graph.astream(
            {"messages": [HumanMessage(content=prompt)]},
            config=config,
            stream_mode=["updates", "messages", "custom"],
            subgraphs=True,
        ):
            for event in serialize_chunk(chunk):
                yield event
    except Exception as exc:  # noqa: BLE001 — surface as event, don't close stream
        log.error("stream_run.error", error=str(exc), thread_id=thread_id)
        yield {"type": "error", "data": {"message": str(exc)}}
    finally:
        yield {"type": "done", "data": {"thread_id": thread_id}}


# Phase-1 convenience: the hardcoded slice spec.
SLICE_SPEC = RESEARCH_WRITE_SLICE
