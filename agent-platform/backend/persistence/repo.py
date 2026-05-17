"""Data-access layer. All DB reads/writes go through these functions.

No agent/graph logic here — pure persistence (per CLAUDE.md layer rules).
"""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Agent, Run, RunStatus, Workflow


# ── Agents ──────────────────────────────────────────────────────────────────
async def list_agents(db: AsyncSession) -> list[Agent]:
    res = await db.execute(
        select(Agent).where(Agent.is_deleted == False).order_by(Agent.id)  # noqa: E712
    )
    return list(res.scalars().all())


async def get_agent(db: AsyncSession, agent_id: int) -> Agent | None:
    return await db.get(Agent, agent_id)


async def create_agent(
    db: AsyncSession,
    *,
    name: str,
    role: str,
    system_prompt: str,
    model: str,
    tools: list[str],
    workflow_id: int | None = None,
    handoff_to: str | None = None,
) -> Agent:
    agent = Agent(
        name=name,
        role=role,
        system_prompt=system_prompt,
        model=model,
        tools=tools,
        workflow_id=workflow_id,
        handoff_to=handoff_to,
    )
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    return agent


async def update_agent(
    db: AsyncSession, agent: Agent, fields: dict[str, object]
) -> Agent:
    """Non-destructive in-place edit (existing threads keep their checkpoints)."""
    for key, value in fields.items():
        if value is not None and hasattr(agent, key):
            setattr(agent, key, value)
    await db.commit()
    await db.refresh(agent)
    return agent


async def soft_delete_agent(db: AsyncSession, agent: Agent) -> None:
    agent.is_deleted = True
    await db.commit()


# ── Workflows ───────────────────────────────────────────────────────────────
async def list_workflows(db: AsyncSession) -> list[Workflow]:
    res = await db.execute(select(Workflow).order_by(Workflow.id))
    return list(res.scalars().all())


async def get_workflow(db: AsyncSession, workflow_id: int) -> Workflow | None:
    return await db.get(Workflow, workflow_id)


async def template_exists(db: AsyncSession, name: str) -> bool:
    res = await db.execute(
        select(Workflow.id).where(
            Workflow.name == name, Workflow.is_template == True  # noqa: E712
        )
    )
    return res.scalar_one_or_none() is not None


async def create_workflow(
    db: AsyncSession,
    *,
    name: str,
    description: str,
    supervisor_prompt: str,
    is_template: bool = False,
) -> Workflow:
    wf = Workflow(
        name=name,
        description=description,
        supervisor_prompt=supervisor_prompt,
        is_template=is_template,
    )
    db.add(wf)
    await db.commit()
    await db.refresh(wf)
    return wf


# ── Runs ────────────────────────────────────────────────────────────────────
async def create_run(
    db: AsyncSession, *, workflow_id: int, thread_id: str, prompt: str
) -> Run:
    run = Run(workflow_id=workflow_id, thread_id=thread_id, prompt=prompt)
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


async def finalize_run(
    db: AsyncSession,
    run_id: int,
    *,
    status: RunStatus,
    input_tokens: int,
    output_tokens: int,
    cost_usd: float,
) -> None:
    run = await db.get(Run, run_id)
    if run is None:
        return
    run.status = status
    run.input_tokens = input_tokens
    run.output_tokens = output_tokens
    run.total_tokens = input_tokens + output_tokens
    run.cost_usd = cost_usd
    run.finished_at = datetime.now(timezone.utc)
    await db.commit()


async def list_runs(db: AsyncSession, limit: int = 50) -> list[Run]:
    res = await db.execute(select(Run).order_by(Run.id.desc()).limit(limit))
    return list(res.scalars().all())


async def get_run(db: AsyncSession, run_id: int) -> Run | None:
    return await db.get(Run, run_id)
