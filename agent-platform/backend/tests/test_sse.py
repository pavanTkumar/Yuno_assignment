"""SSE /runs endpoint — streaming + run persistence (LLM stubbed)."""

from __future__ import annotations

from collections.abc import AsyncIterator

import pytest

import api.runs as runs_api
from streaming.serializers import SSEEvent

pytestmark = pytest.mark.asyncio


async def _fake_stream(graph, prompt, thread_id) -> AsyncIterator[SSEEvent]:
    yield {"type": "node_start", "data": {"node": "supervisor"}}
    yield {"type": "token", "data": {"node": "researcher", "text": "hello "}}
    yield {"type": "token", "data": {"node": "writer", "text": "world"}}
    yield {
        "type": "usage",
        "data": {
            "input_tokens": 10,
            "output_tokens": 5,
            "total_tokens": 15,
        },
    }
    yield {"type": "done", "data": {"thread_id": thread_id}}


async def test_runs_sse_streams_and_persists(client, monkeypatch) -> None:
    monkeypatch.setattr(runs_api, "stream_graph", _fake_stream)
    monkeypatch.setattr(runs_api, "get_graph", lambda wf: object())

    wf = (await client.get("/workflows")).json()[0]
    async with client.stream(
        "POST",
        "/runs",
        json={"workflow_id": wf["id"], "prompt": "hi"},
    ) as res:
        assert res.status_code == 200
        assert res.headers["cache-control"] == "no-cache"
        assert res.headers["x-accel-buffering"] == "no"
        body = ""
        async for chunk in res.aiter_text():
            body += chunk

    assert "event: node_start" in body
    assert "event: token" in body
    assert "event: usage" in body
    assert "event: done" in body

    runs = (await client.get("/runs")).json()
    assert len(runs) == 1
    assert runs[0]["status"] == "completed"
    assert runs[0]["total_tokens"] == 15


async def test_run_not_found(client) -> None:
    res = await client.post(
        "/runs", json={"workflow_id": 9999, "prompt": "x"}
    )
    assert res.status_code == 404
