"""FastAPI application entry point and composition root."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from api.agents import router as agents_router
from api.graph import router as graph_router
from api.runs import router as runs_router
from api.workflows import router as workflows_router
from config import configure_logging, log, settings
from core.runtime import checkpointer_lifespan
from core.templates import TEMPLATES
from persistence import repo
from persistence.db import SessionLocal, init_db

configure_logging()


async def _seed_templates() -> None:
    """Idempotently load the preloaded workflow templates + their agents."""
    async with SessionLocal() as db:
        for tpl in TEMPLATES:
            if await repo.template_exists(db, tpl.name):
                continue
            wf = await repo.create_workflow(
                db,
                name=tpl.name,
                description=tpl.description,
                supervisor_prompt=tpl.supervisor_prompt,
                is_template=True,
            )
            for a in tpl.agents:
                await repo.create_agent(
                    db,
                    name=a.name,
                    role=a.role,
                    system_prompt=a.system_prompt,
                    model=settings.resolved_default_model,
                    tools=a.tools,
                    workflow_id=wf.id,
                )
            log.info("template.seeded", name=tpl.name)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await init_db()
    await _seed_templates()
    async with checkpointer_lifespan():
        log.info("app.started", provider=settings.llm_provider)
        yield
    log.info("app.stopped")


app = FastAPI(title="AI Agent Orchestration Platform", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents_router)
app.include_router(workflows_router)
app.include_router(graph_router)
app.include_router(runs_router)


class HealthResponse(BaseModel):
    status: str


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok")
