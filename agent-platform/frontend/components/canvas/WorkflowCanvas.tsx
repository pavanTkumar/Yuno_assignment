// ReactFlow canvas — the hero component. Live node highlight + animated edges
// driven by SSE node status from the run store.

"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { Topology } from "@/lib/api";
import { useRunStore, type NodeStatus } from "@/lib/store";
import { AgentNode, type AgentNodeData } from "./AgentNode";

const nodeTypes = { agent: AgentNode };

function layout(topology: Topology): Node[] {
  const agents = topology.nodes.filter((n) => n.kind === "agent");
  return topology.nodes.map((n) => {
    const isSup = n.kind === "supervisor";
    const idx = agents.findIndex((a) => a.id === n.id);
    return {
      id: n.id,
      type: "agent",
      position: isSup
        ? { x: 240, y: 40 }
        : { x: 240 + (idx - (agents.length - 1) / 2) * 240, y: 240 },
      data: {
        label: n.label,
        role: n.role,
        kind: n.kind,
        status: "idle" as NodeStatus,
      } satisfies AgentNodeData,
    };
  });
}

export function WorkflowCanvas({ topology }: { topology: Topology }) {
  const nodeStatus = useRunStore((s) => s.nodeStatus);

  const baseNodes = useMemo(() => layout(topology), [topology]);

  const nodes: Node[] = baseNodes.map((n) => ({
    ...n,
    data: {
      ...(n.data as AgentNodeData),
      status: nodeStatus[n.id] ?? "idle",
    },
  }));

  const edges: Edge[] = topology.edges.map((e) => {
    const active =
      nodeStatus[e.target] === "running" ||
      nodeStatus[e.source] === "running";
    return {
      id: `${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      animated: active,
      className: active ? "edge-active" : undefined,
      style: active ? undefined : { stroke: "var(--border)" },
    };
  });

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        proOptions={{ hideAttribution: true }}
        colorMode="dark"
      >
        <Background color="#2a2e3a" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
