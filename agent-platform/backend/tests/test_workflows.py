"""Template seeding, topology, and clone."""

from __future__ import annotations

import pytest

pytestmark = pytest.mark.asyncio


async def test_templates_seeded(client) -> None:
    res = await client.get("/workflows")
    assert res.status_code == 200
    names = {w["name"] for w in res.json()}
    assert {"Research & Write", "Customer Support"} <= names
    rw = next(w for w in res.json() if w["name"] == "Research & Write")
    assert rw["is_template"] is True
    assert [a["name"] for a in rw["agents"]] == ["researcher", "writer"]


async def test_topology_shape(client) -> None:
    wf = (await client.get("/workflows")).json()[0]
    res = await client.get(f"/graph/topology?workflow_id={wf['id']}")
    assert res.status_code == 200
    topo = res.json()
    node_ids = {n["id"] for n in topo["nodes"]}
    assert "supervisor" in node_ids
    assert all(
        e["source"] == "supervisor" for e in topo["edges"]
    )


async def test_clone_is_editable_copy(client) -> None:
    wf = (await client.get("/workflows")).json()[0]
    res = await client.post(f"/workflows/{wf['id']}/clone")
    assert res.status_code == 201
    clone = res.json()
    assert clone["is_template"] is False
    assert clone["id"] != wf["id"]
    assert [a["name"] for a in clone["agents"]] == [
        a["name"] for a in wf["agents"]
    ]
