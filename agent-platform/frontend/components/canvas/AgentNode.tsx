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
  idle: "ring-border-strong",
  running: "ring-status-running node-running",
  done: "ring-success",
  error: "ring-status-error",
};

const STATUS_LABEL: Record<NodeStatus, string> = {
  idle: "Idle",
  running: "Running",
  done: "Done",
  error: "Error",
};

const STATUS_DOT: Record<NodeStatus, string> = {
  idle: "bg-status-idle",
  running: "bg-status-running",
  done: "bg-success",
  error: "bg-status-error",
};

export function AgentNode({ data }: NodeProps) {
  const d = data as AgentNodeData;
  const isSupervisor = d.kind === "supervisor";

  return (
    <div
      className={`group relative rounded-[12px] border bg-surface-2 ring-2 transition-all duration-200 ${
        RING[d.status]
      } ${
        isSupervisor
          ? "border-primary/40 bg-gradient-to-b from-surface-2 to-surface"
          : "border-border"
      }`}
      style={{ minWidth: 188 }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-border-strong"
      />

      <div className="flex items-center justify-between gap-3 px-4 pt-3">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{
              background: isSupervisor
                ? "var(--primary)"
                : "var(--accent)",
              boxShadow: isSupervisor
                ? "0 0 8px var(--glow-primary)"
                : "0 0 8px rgba(45,212,191,0.4)",
            }}
          />
          <span className="text-[14px] font-semibold tracking-tight text-text">
            {d.label}
          </span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-wider text-text-faint">
          {isSupervisor ? "Supervisor" : "Agent"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-2">
        <span className="rounded-[6px] border border-border bg-surface px-2 py-0.5 text-[11px] text-text-muted">
          {d.role}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              STATUS_DOT[d.status]
            } ${d.status === "running" ? "cursor-blink" : ""}`}
          />
          {STATUS_LABEL[d.status]}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-border-strong"
      />
    </div>
  );
}
