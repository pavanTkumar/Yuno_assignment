// Custom ReactFlow node — name, role badge, status ring (DESIGN.md tokens).

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeStatus } from "@/lib/store";

export interface AgentNodeData extends Record<string, unknown> {
  label: string;
  role: string;
  kind: "supervisor" | "agent";
  status: NodeStatus;
}

const RING: Record<NodeStatus, string> = {
  idle: "ring-status-idle",
  running: "ring-status-running node-running",
  done: "ring-success",
  error: "ring-status-error",
};

export function AgentNode({ data }: NodeProps) {
  const d = data as AgentNodeData;
  const isSupervisor = d.kind === "supervisor";
  return (
    <div
      className={`rounded-[10px] border border-border bg-surface-2 px-4 py-3 ring-2 ${
        RING[d.status]
      } transition-all duration-200`}
      style={{ minWidth: 168 }}
    >
      <Handle type="target" position={Position.Top} className="!bg-border" />
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{
            background: isSupervisor
              ? "var(--primary)"
              : "var(--accent)",
          }}
        />
        <span className="text-[14px] font-semibold text-text">
          {d.label}
        </span>
      </div>
      <div className="mt-1 inline-block rounded-[6px] bg-surface px-2 py-0.5 text-[12px] text-text-muted">
        {d.role}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-border"
      />
    </div>
  );
}
