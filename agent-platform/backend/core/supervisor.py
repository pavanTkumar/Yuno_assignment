"""Supervisor graph construction (LangGraph + langgraph-supervisor).

API note (langgraph 1.2 / langgraph-supervisor 0.0.31):
- `create_agent` takes `system_prompt=` (CLAUDE.md's `prompt=` example is outdated).
- `create_supervisor` returns a StateGraph; we `.compile(checkpointer=...)` it.

The compiled graph holds NO conversation state — state lives in the SqliteSaver
checkpointer keyed by thread_id passed at invoke time.
"""

from __future__ import annotations

from dataclasses import dataclass

from langchain.agents import create_agent
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph.state import CompiledStateGraph
from langgraph_supervisor import create_supervisor

from config import settings
from core.llm import make_llm
from tools import resolve_tools


@dataclass(frozen=True, slots=True)
class AgentSpec:
    """A worker-agent definition (mirrors the persisted Agent row)."""

    name: str
    role: str
    system_prompt: str
    model: str
    tools: list[str]


@dataclass(frozen=True, slots=True)
class WorkflowSpec:
    """Everything needed to build one supervisor graph."""

    name: str
    supervisor_prompt: str
    supervisor_model: str
    agents: list[AgentSpec]


def _sanitize(name: str) -> str:
    """LangGraph node names must be identifier-safe."""
    return "".join(c if c.isalnum() else "_" for c in name).strip("_").lower()


def build_supervisor(
    spec: WorkflowSpec, checkpointer: AsyncSqliteSaver
) -> CompiledStateGraph:
    """Build and compile a supervisor graph from a workflow spec."""
    workers = [
        create_agent(
            make_llm(a.model),
            resolve_tools(a.tools),
            system_prompt=a.system_prompt,
            name=_sanitize(a.name),
        )
        for a in spec.agents
    ]
    graph = create_supervisor(
        workers,
        model=make_llm(spec.supervisor_model),
        prompt=spec.supervisor_prompt,
        supervisor_name="supervisor",
        output_mode="full_history",
    )
    return graph.compile(checkpointer=checkpointer)


# ── Hardcoded vertical-slice spec (Phase 1 risk burn-down) ──────────────────
# Replaced by DB-driven specs in Phase 2 (core/builder.py).
_DEFAULT = settings.resolved_default_model
RESEARCH_WRITE_SLICE = WorkflowSpec(
    name="Research & Write",
    supervisor_prompt=(
        "You route tasks between specialists. Use 'researcher' to gather facts, "
        "then 'writer' to produce the final prose. Do not answer directly."
    ),
    supervisor_model=_DEFAULT,
    agents=[
        AgentSpec(
            name="researcher",
            role="Research",
            system_prompt="You research topics and return concise factual notes.",
            model=_DEFAULT,
            tools=["web_search"],
        ),
        AgentSpec(
            name="writer",
            role="Writing",
            system_prompt="You turn research notes into a clear, well-structured report.",
            model=_DEFAULT,
            tools=[],
        ),
    ],
)
