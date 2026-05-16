"""Pydantic request/response models shared across routers."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class AgentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: str
    system_prompt: str
    model: str
    tools: list[str]
    workflow_id: int | None


class CreateAgentRequest(BaseModel):
    name: str
    role: str
    system_prompt: str
    model: str = ""
    tools: list[str] = []
    workflow_id: int | None = None


class UpdateAgentRequest(BaseModel):
    name: str | None = None
    role: str | None = None
    system_prompt: str | None = None
    model: str | None = None
    tools: list[str] | None = None


class AgentSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    role: str


class WorkflowResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str
    supervisor_prompt: str
    is_template: bool
    agents: list[AgentSummary]


class GraphNode(BaseModel):
    id: str
    label: str
    role: str
    kind: str  # "supervisor" | "agent"


class GraphEdge(BaseModel):
    source: str
    target: str


class TopologyResponse(BaseModel):
    workflow_id: int
    nodes: list[GraphNode]
    edges: list[GraphEdge]


class RunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    workflow_id: int
    thread_id: str
    prompt: str
    status: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    cost_usd: float
    started_at: datetime
    finished_at: datetime | None


class ModelsResponse(BaseModel):
    provider: str
    models: list[str]
    default: str
