"""Build supervisor graphs from persisted workflow/agent rows.

Compiled graphs are cached per workflow id (rebuilt when the workflow's agents
change, keyed by a cheap config signature).
"""

from __future__ import annotations

from langgraph.graph.state import CompiledStateGraph

from persistence.models import Workflow

from .runtime import get_checkpointer
from .supervisor import AgentSpec, WorkflowSpec, build_supervisor

# workflow_id -> (signature, compiled graph)
_CACHE: dict[int, tuple[str, CompiledStateGraph]] = {}


def spec_from_workflow(workflow: Workflow) -> WorkflowSpec:
    """Translate a persisted Workflow (+ its agents) into a WorkflowSpec."""
    agents = [
        AgentSpec(
            name=a.name,
            role=a.role,
            system_prompt=a.system_prompt,
            model=a.model,
            tools=list(a.tools or []),
            handoff_to=a.handoff_to,
        )
        for a in workflow.agents
    ]
    return WorkflowSpec(
        name=workflow.name,
        supervisor_prompt=workflow.supervisor_prompt,
        supervisor_model=agents[0].model if agents else "",
        agents=agents,
    )


def _signature(workflow: Workflow) -> str:
    parts = [workflow.supervisor_prompt]
    for a in workflow.agents:
        parts.append(f"{a.id}:{a.name}:{a.model}:{a.system_prompt}:{a.tools}")
    return "|".join(parts)


def get_graph(workflow: Workflow) -> CompiledStateGraph:
    """Return a compiled supervisor graph for this workflow (cached)."""
    sig = _signature(workflow)
    cached = _CACHE.get(workflow.id)
    if cached and cached[0] == sig:
        return cached[1]
    graph = build_supervisor(spec_from_workflow(workflow), get_checkpointer())
    _CACHE[workflow.id] = (sig, graph)
    return graph


def invalidate(workflow_id: int) -> None:
    _CACHE.pop(workflow_id, None)
