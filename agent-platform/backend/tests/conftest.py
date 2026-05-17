"""Shared test fixtures.

Tests use the app's SQLite DB pointed at a temp file via DATABASE_URL set
BEFORE any app import, and never call a real LLM (the graph runtime is stubbed
where streaming is exercised).
"""

from __future__ import annotations

import os
import tempfile
from collections.abc import AsyncIterator

import pytest_asyncio

_TMP_DB = os.path.join(tempfile.gettempdir(), "agent_platform_test.db")
for _f in (_TMP_DB, _TMP_DB + "-shm", _TMP_DB + "-wal"):
    if os.path.exists(_f):
        os.remove(_f)

# Must be set before importing config/app.
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP_DB}"
os.environ.setdefault("OPENAI_API_KEY", "test-key")

from httpx import ASGITransport, AsyncClient  # noqa: E402

import main  # noqa: E402
from persistence.db import engine  # noqa: E402
from persistence.models import Base  # noqa: E402


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    """App client on a fresh schema with templates seeded (no lifespan/LLM)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await main._seed_templates()

    transport = ASGITransport(app=main.app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
