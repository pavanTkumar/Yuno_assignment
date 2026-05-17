"""Agent CRUD + soft-delete behavior."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_create_and_list_agent(client) -> None:
    res = await client.post(
        "/agents",
        json={
            "name": "tester",
            "role": "QA",
            "system_prompt": "You test things.",
        },
    )
    assert res.status_code == 201
    body = res.json()
    assert body["name"] == "tester"
    assert body["model"]  # default applied

    listed = await client.get("/agents")
    assert any(a["name"] == "tester" for a in listed.json())


async def test_update_agent_in_place(client) -> None:
    created = (
        await client.post(
            "/agents",
            json={"name": "a", "role": "R", "system_prompt": "p"},
        )
    ).json()
    res = await client.patch(
        f"/agents/{created['id']}", json={"role": "Updated"}
    )
    assert res.status_code == 200
    assert res.json()["role"] == "Updated"


async def test_soft_delete_excludes_from_list(client) -> None:
    created = (
        await client.post(
            "/agents",
            json={"name": "tmp", "role": "R", "system_prompt": "p"},
        )
    ).json()
    res = await client.delete(f"/agents/{created['id']}")
    assert res.status_code == 204

    listed = await client.get("/agents")
    assert all(a["id"] != created["id"] for a in listed.json())

    # 404 on a second delete (already soft-deleted).
    assert (await client.delete(f"/agents/{created['id']}")).status_code == 404


async def test_models_endpoint(client) -> None:
    res = await client.get("/agents/models")
    assert res.status_code == 200
    body = res.json()
    assert body["provider"]
    assert body["default"]
