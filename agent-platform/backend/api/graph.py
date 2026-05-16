"""Graph topology router — supplies nodes/edges for the ReactFlow canvas.

Supervisor pattern: one supervisor node with an edge to every worker agent.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from persistence import repo
from persistence.db import get_session

from .schemas import GraphEdge, GraphNode, TopologyResponse

router = APIRouter(prefix="/graph", tags=["graph"])


@router.get("/topology", response_model=TopologyResponse)
async def get_topology(
    workflow_id: int, db: AsyncSession = Depends(get_session)
) -> TopologyResponse:
    wf = await repo.get_workflow(db, workflow_id)
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")

    nodes: list[GraphNode] = [
        GraphNode(
            id="supervisor",
            label="Supervisor",
            role="Orchestrator",
            kind="supervisor",
        )
    ]
    edges: list[GraphEdge] = []
    for a in wf.agents:
        nodes.append(
            GraphNode(id=a.name, label=a.name, role=a.role, kind="agent")
        )
        edges.append(GraphEdge(source="supervisor", target=a.name))

    return TopologyResponse(workflow_id=workflow_id, nodes=nodes, edges=edges)
