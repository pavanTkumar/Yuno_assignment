"""LangGraph @tool-decorated tools, resolvable by name."""

from __future__ import annotations

from langchain_core.tools import BaseTool

from .web_search import web_search

# Registry: agent configs store tool names; this maps them to tool objects.
TOOL_REGISTRY: dict[str, BaseTool] = {
    "web_search": web_search,
}


def resolve_tools(names: list[str]) -> list[BaseTool]:
    """Map a list of tool names to tool objects, ignoring unknown names."""
    return [TOOL_REGISTRY[n] for n in names if n in TOOL_REGISTRY]
