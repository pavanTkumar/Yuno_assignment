"""SQLAlchemy ORM models — CRUD-managed agent configs and run metadata.

LangGraph conversation state lives in the SqliteSaver checkpointer, NOT here.
These tables only hold what the UI needs to manage and display.
"""

from __future__ import annotations

import enum
from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class RunStatus(str, enum.Enum):
    running = "running"
    completed = "completed"
    error = "error"


class Agent(Base):
    """A configurable worker agent. Soft-deleted so threads stay queryable."""

    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    role: Mapped[str] = mapped_column(String(120), nullable=False)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    model: Mapped[str] = mapped_column(String(60), nullable=False, default="gpt-4o-mini")
    # List of tool names this agent may use (e.g. ["web_search"]).
    tools: Mapped[list[str]] = mapped_column(JSON, nullable=False, default=list)
    # Which workflow this agent belongs to (templates create their own agents).
    workflow_id: Mapped[int | None] = mapped_column(
        ForeignKey("workflows.id"), nullable=True
    )
    is_deleted: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )


class Workflow(Base):
    """A named multi-agent topology (a supervisor over its worker agents)."""

    __tablename__ = "workflows"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    supervisor_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    # True for the preloaded, read-only seed templates.
    is_template: Mapped[bool] = mapped_column(default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )

    agents: Mapped[list[Agent]] = relationship(
        "Agent",
        primaryjoin="and_(Workflow.id == Agent.workflow_id, Agent.is_deleted == False)",
        viewonly=True,
        lazy="selectin",
    )


class Run(Base):
    """One execution of a workflow. Token/cost metadata for live monitoring."""

    __tablename__ = "runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    workflow_id: Mapped[int] = mapped_column(
        ForeignKey("workflows.id"), nullable=False
    )
    thread_id: Mapped[str] = mapped_column(String(120), nullable=False, index=True)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[RunStatus] = mapped_column(
        Enum(RunStatus), default=RunStatus.running, nullable=False
    )
    input_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    output_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    total_tokens: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    cost_usd: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, nullable=False
    )
    finished_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
