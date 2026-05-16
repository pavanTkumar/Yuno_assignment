"""Agents router — HTTP routing only (no business logic, no LangGraph)."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from core.llm import supported_models
from persistence import repo
from persistence.db import get_session

from .schemas import (
    AgentResponse,
    CreateAgentRequest,
    ModelsResponse,
    UpdateAgentRequest,
)
from config import settings

router = APIRouter(prefix="/agents", tags=["agents"])


@router.get("", response_model=list[AgentResponse])
async def list_agents(db: AsyncSession = Depends(get_session)) -> list[AgentResponse]:
    agents = await repo.list_agents(db)
    return [AgentResponse.model_validate(a) for a in agents]


@router.get("/models", response_model=ModelsResponse)
async def list_models() -> ModelsResponse:
    return ModelsResponse(
        provider=settings.llm_provider,
        models=list(supported_models()),
        default=settings.resolved_default_model,
    )


@router.post("", response_model=AgentResponse, status_code=201)
async def create_agent(
    body: CreateAgentRequest, db: AsyncSession = Depends(get_session)
) -> AgentResponse:
    agent = await repo.create_agent(
        db,
        name=body.name,
        role=body.role,
        system_prompt=body.system_prompt,
        model=body.model or settings.resolved_default_model,
        tools=body.tools,
        workflow_id=body.workflow_id,
    )
    return AgentResponse.model_validate(agent)


@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    body: UpdateAgentRequest,
    db: AsyncSession = Depends(get_session),
) -> AgentResponse:
    agent = await repo.get_agent(db, agent_id)
    if agent is None or agent.is_deleted:
        raise HTTPException(status_code=404, detail="Agent not found")
    updated = await repo.update_agent(db, agent, body.model_dump(exclude_unset=True))
    return AgentResponse.model_validate(updated)


@router.delete("/{agent_id}", status_code=204)
async def delete_agent(
    agent_id: int, db: AsyncSession = Depends(get_session)
) -> None:
    agent = await repo.get_agent(db, agent_id)
    if agent is None or agent.is_deleted:
        raise HTTPException(status_code=404, detail="Agent not found")
    await repo.soft_delete_agent(db, agent)
