"""Workflow graph construction — deterministic sequential pipeline.

Why not langgraph-supervisor's tool-call handoffs: empirically, an LLM
choosing to call `transfer_to_<next>` is non-deterministic (~60-70% across
Groq / OpenRouter / OpenAI). For a demo-critical feature that is unacceptable,
and CLAUDE.md explicitly permits deviating from pure supervisor routing.

Instead we build a `StateGraph` with FIXED edges:

    START → supervisor → agent[0] → agent[1] → … → END

`supervisor` is a lightweight, no-LLM entry node (kept so the canvas/topology
still shows a Supervisor orchestrating the agents, and as the single thread
entry point). Each agent is a `create_agent` worker that sees the running
message history, so the writer always receives the researcher's notes.

State lives in the SqliteSaver checkpointer keyed by thread_id (so Telegram ↔
web continuation still works).
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from langchain.agents import create_agent
from langchain_core.messages import AIMessage
from langgraph.checkpoint.sqlite.aio import AsyncSqliteSaver
from langgraph.graph import END, START, MessagesState, StateGraph
from langgraph.graph.state import CompiledStateGraph

from config import settings
from core.llm import make_llm
from tools import resolve_tools


@dataclass(frozen=True, slots=True)
class AgentSpec:
    """A worker-agent definition (mirrors the persisted Agent row).

    `handoff_to` is retained for API stability but is unused by the
    deterministic builder (sequencing is by list order).
    """

    name: str
    role: str
    system_prompt: str
    model: str
    tools: list[str]
    handoff_to: str | None = None


@dataclass(frozen=True, slots=True)
class WorkflowSpec:
    """Everything needed to build one workflow graph."""

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
    """Build and compile a deterministic sequential workflow graph."""
    if not spec.agents:
        raise ValueError("Workflow has no agents")

    graph: StateGraph = StateGraph(MessagesState)

    names = [_sanitize(a.name) for a in spec.agents]

    async def supervisor(state: MessagesState) -> dict[str, Any]:
        """No-LLM entry: announce the routing plan for the monitor drawer."""
        plan = " → ".join(names)
        return {
            "messages": [
                AIMessage(content=f"Routing through: {plan}", name="supervisor")
            ]
        }

    graph.add_node("supervisor", supervisor)
    graph.add_edge(START, "supervisor")

    prev = "supervisor"
    for spec_agent, node_name in zip(spec.agents, names):
        worker = create_agent(
            make_llm(spec_agent.model),
            resolve_tools(spec_agent.tools),
            system_prompt=spec_agent.system_prompt,
            name=node_name,
        )
        graph.add_node(node_name, worker)
        graph.add_edge(prev, node_name)
        prev = node_name

    graph.add_edge(prev, END)
    return graph.compile(checkpointer=checkpointer)


# ── Hardcoded vertical-slice spec (Phase 1 path; DB-driven specs in Phase 2) ──
_DEFAULT = settings.resolved_default_model
RESEARCH_WRITE_SLICE = WorkflowSpec(
    name="Research & Write",
    supervisor_prompt="Route research to the researcher, then writing to the writer.",
    supervisor_model=_DEFAULT,
    agents=[
        AgentSpec(
            name="researcher",
            role="Research",
            system_prompt=(
                "You are a research specialist. Gather accurate, concise facts "
                "on the topic as short bullet points. Do not write final prose."
            ),
            model=_DEFAULT,
            tools=["web_search"],
        ),
        AgentSpec(
            name="writer",
            role="Writing",
            system_prompt=(
                "You are a writing specialist. Using the researcher's notes in "
                "the conversation, write the final clear, well-structured "
                "report. Do not invent facts."
            ),
            model=_DEFAULT,
            tools=[],
        ),
    ],
)
