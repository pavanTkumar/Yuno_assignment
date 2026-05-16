"""Workflows router — list, get, and clone workflow templates."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from persistence import repo
from persistence.db import get_session

from .schemas import WorkflowResponse

router = APIRouter(prefix="/workflows", tags=["workflows"])


@router.get("", response_model=list[WorkflowResponse])
async def list_workflows(
    db: AsyncSession = Depends(get_session),
) -> list[WorkflowResponse]:
    workflows = await repo.list_workflows(db)
    return [WorkflowResponse.model_validate(w) for w in workflows]


@router.get("/{workflow_id}", response_model=WorkflowResponse)
async def get_workflow(
    workflow_id: int, db: AsyncSession = Depends(get_session)
) -> WorkflowResponse:
    wf = await repo.get_workflow(db, workflow_id)
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowResponse.model_validate(wf)


@router.post("/{workflow_id}/clone", response_model=WorkflowResponse, status_code=201)
async def clone_workflow(
    workflow_id: int, db: AsyncSession = Depends(get_session)
) -> WorkflowResponse:
    """Clone a (template) workflow into an editable, non-template copy."""
    src = await repo.get_workflow(db, workflow_id)
    if src is None:
        raise HTTPException(status_code=404, detail="Workflow not found")

    clone = await repo.create_workflow(
        db,
        name=f"{src.name} (copy)",
        description=src.description,
        supervisor_prompt=src.supervisor_prompt,
        is_template=False,
    )
    for a in src.agents:
        await repo.create_agent(
            db,
            name=a.name,
            role=a.role,
            system_prompt=a.system_prompt,
            model=a.model,
            tools=list(a.tools or []),
            workflow_id=clone.id,
        )
    await db.refresh(clone)
    return WorkflowResponse.model_validate(clone)
