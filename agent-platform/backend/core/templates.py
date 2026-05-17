"""Preloaded workflow templates (seeded idempotently on startup).

A template is a Workflow(is_template=True) plus its worker Agent rows. Cloning
a template (api/workflows.py) copies it into an editable, non-template Workflow.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True, slots=True)
class TemplateAgent:
    name: str
    role: str
    system_prompt: str
    tools: list[str]
    handoff_to: str | None = None


@dataclass(frozen=True, slots=True)
class Template:
    name: str
    description: str
    supervisor_prompt: str
    agents: list[TemplateAgent]


# Agents run in a deterministic sequence (list order): the graph wires fixed
# edges supervisor → agents[0] → agents[1] → END, so no agent has to "decide"
# to hand off. Prompts are plain role descriptions.
TEMPLATES: list[Template] = [
    Template(
        name="Research & Write",
        description="A researcher gathers facts; a writer turns them into a report.",
        supervisor_prompt="Coordinate a researcher and a writer in sequence.",
        agents=[
            TemplateAgent(
                name="researcher",
                role="Research",
                system_prompt=(
                    "You are a research specialist. Gather accurate, concise "
                    "facts on the requested topic and present them as short "
                    "bullet points. Do not write the final prose — the writer "
                    "does that next."
                ),
                tools=["web_search"],
            ),
            TemplateAgent(
                name="writer",
                role="Writing",
                system_prompt=(
                    "You are a writing specialist. Using the researcher's notes "
                    "earlier in this conversation, write the final clear, "
                    "well-structured report. Do not invent facts."
                ),
                tools=[],
            ),
        ],
    ),
    Template(
        name="Customer Support",
        description="Triage classifies the request; a resolver answers it.",
        supervisor_prompt="Coordinate a triage agent and a resolver in sequence.",
        agents=[
            TemplateAgent(
                name="triage",
                role="Triage",
                system_prompt=(
                    "You are a support triage agent. Classify the customer's "
                    "request (billing, technical, or general) and summarize the "
                    "core issue concisely. Do not resolve it — the resolver "
                    "does that next."
                ),
                tools=[],
            ),
            TemplateAgent(
                name="resolver",
                role="Resolution",
                system_prompt=(
                    "You are a support resolution agent. Using the triage "
                    "summary earlier in this conversation, give a clear, "
                    "friendly, actionable answer."
                ),
                tools=[],
            ),
        ],
    ),
]
