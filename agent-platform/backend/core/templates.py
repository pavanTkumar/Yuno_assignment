"""Preloaded workflow templates (seeded idempotently on startup).

A template is a Workflow(is_template=True) plus its worker Agent rows. Cloning
a template (api/workflows.py) copies it into an editable, non-template Workflow.
"""

from __future__ import annotations

from dataclasses import dataclass

from config import settings


@dataclass(frozen=True, slots=True)
class TemplateAgent:
    name: str
    role: str
    system_prompt: str
    tools: list[str]


@dataclass(frozen=True, slots=True)
class Template:
    name: str
    description: str
    supervisor_prompt: str
    agents: list[TemplateAgent]


def _model() -> str:
    return settings.resolved_default_model


TEMPLATES: list[Template] = [
    Template(
        name="Research & Write",
        description="A researcher gathers facts; a writer turns them into a report.",
        supervisor_prompt=(
            "You coordinate a research team. First delegate to 'researcher' to "
            "gather facts, then delegate to 'writer' to produce the final report. "
            "Never answer the user directly — always delegate."
        ),
        agents=[
            TemplateAgent(
                name="researcher",
                role="Research",
                system_prompt=(
                    "You are a research specialist. Gather accurate, concise facts "
                    "on the requested topic and return them as bullet points."
                ),
                tools=["web_search"],
            ),
            TemplateAgent(
                name="writer",
                role="Writing",
                system_prompt=(
                    "You are a writing specialist. Turn the researcher's notes into "
                    "a clear, well-structured report. Do not invent facts."
                ),
                tools=[],
            ),
        ],
    ),
    Template(
        name="Customer Support",
        description="Triage classifies the request; a resolver answers it.",
        supervisor_prompt=(
            "You run a support desk. First delegate to 'triage' to classify the "
            "request, then to 'resolver' to answer it. Always delegate."
        ),
        agents=[
            TemplateAgent(
                name="triage",
                role="Triage",
                system_prompt=(
                    "You are a support triage agent. Classify the customer's request "
                    "(billing, technical, or general) and summarize the core issue."
                ),
                tools=[],
            ),
            TemplateAgent(
                name="resolver",
                role="Resolution",
                system_prompt=(
                    "You are a support resolution agent. Give a clear, friendly, "
                    "actionable answer based on the triage summary."
                ),
                tools=[],
            ),
        ],
    ),
]
