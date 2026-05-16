"""Tavily-backed web search tool. Graceful no-op when no API key is set."""

from __future__ import annotations

from langchain_core.tools import tool

from config import log, settings


@tool
def web_search(query: str) -> str:
    """Search the web for up-to-date information on a topic.

    Returns a concatenated summary of the top results.
    """
    if not settings.tavily_api_key:
        log.info("web_search.skipped", reason="no TAVILY_API_KEY")
        return (
            f"[web search unavailable — no TAVILY_API_KEY configured] "
            f"Answer '{query}' from prior knowledge."
        )
    try:
        from tavily import TavilyClient

        client = TavilyClient(api_key=settings.tavily_api_key)
        res = client.search(query=query, max_results=5)
        results = res.get("results", [])
        if not results:
            return f"No web results found for: {query}"
        return "\n\n".join(
            f"{r.get('title', 'Untitled')}\n{r.get('content', '')}" for r in results
        )
    except Exception as exc:  # noqa: BLE001 — tool must never crash the graph
        log.warning("web_search.error", error=str(exc))
        return f"[web search failed: {exc}] Answer '{query}' from prior knowledge."
