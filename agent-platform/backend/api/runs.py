"""Runs router — start a workflow run, stream SSE, persist run metadata.

Routing + orchestration only: streaming logic lives in core/, DB access in
persistence/. This layer wires them together and accumulates usage.
"""

from __future__ import annotations

import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.builder import get_graph
from core.cost import estimate_cost
from core.runtime import stream_graph
from persistence import repo
from persistence.db import SessionLocal, get_session
from persistence.models import RunStatus
from streaming.sse import SSE_HEADERS, format_sse

from .schemas import RunResponse

router = APIRouter(prefix="/runs", tags=["runs"])


class CreateRunRequest(BaseModel):
    workflow_id: int
    prompt: str
    thread_id: str | None = None


@router.post("")
async def create_run(
    body: CreateRunRequest, db: AsyncSession = Depends(get_session)
) -> StreamingResponse:
    """Start a workflow run and stream typed SSE events back."""
    workflow = await repo.get_workflow(db, body.workflow_id)
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if not workflow.agents:
        raise HTTPException(status_code=400, detail="Workflow has no agents")

    thread_id = body.thread_id or f"web-{uuid.uuid4().hex[:12]}"
    graph = get_graph(workflow)
    run = await repo.create_run(
        db, workflow_id=workflow.id, thread_id=thread_id, prompt=body.prompt
    )
    model = workflow.agents[0].model

    async def event_source() -> AsyncIterator[str]:
        in_tok = out_tok = 0
        status = RunStatus.completed
        try:
            async for event in stream_graph(graph, body.prompt, thread_id):
                if event["type"] == "usage":
                    in_tok = max(in_tok, event["data"]["input_tokens"])
                    out_tok += event["data"]["output_tokens"]
                    cost = estimate_cost(model, in_tok, out_tok)
                    event["data"]["cost_usd"] = cost
                    event["data"]["run_id"] = run.id
                elif event["type"] == "error":
                    status = RunStatus.error
                yield format_sse(event)
        finally:
            # Fresh session — the request-scoped one is closed once we return.
            async with SessionLocal() as bg:
                await repo.finalize_run(
                    bg,
                    run.id,
                    status=status,
                    input_tokens=in_tok,
                    output_tokens=out_tok,
                    cost_usd=estimate_cost(model, in_tok, out_tok),
                )

    return StreamingResponse(
        event_source(), media_type="text/event-stream", headers=SSE_HEADERS
    )


@router.get("", response_model=list[RunResponse])
async def list_runs(db: AsyncSession = Depends(get_session)) -> list[RunResponse]:
    runs = await repo.list_runs(db)
    return [RunResponse.model_validate(r) for r in runs]


@router.get("/{run_id}", response_model=RunResponse)
async def get_run(
    run_id: int, db: AsyncSession = Depends(get_session)
) -> RunResponse:
    run = await repo.get_run(db, run_id)
    if run is None:
        raise HTTPException(status_code=404, detail="Run not found")
    return RunResponse.model_validate(run)
