// Typed Zustand store: live run state driven by SSE events.

import { create } from "zustand";
import type { StreamEvent } from "./useAgentStream";

export type NodeStatus = "idle" | "running" | "done" | "error";

export interface AgentMessage {
  node: string;
  text: string;
}

/**
 * Collapse the supervisor's echo of a worker's output.
 * langgraph-supervisor re-streams the final answer through the supervisor
 * namespace; we drop any earlier entry whose text is fully contained in a
 * later, longer entry so the chat shows each unique message once.
 */
export function dedupeTranscript(t: AgentMessage[]): AgentMessage[] {
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  return t.filter((m, i) => {
    const a = norm(m.text);
    if (!a) return false;
    return !t.some(
      (other, j) =>
        j > i && norm(other.text).includes(a) && norm(other.text) !== a,
    );
  });
}

interface RunState {
  // node id -> status (drives canvas highlighting)
  nodeStatus: Record<string, NodeStatus>;
  // authoritative per-agent messages (built from agent_message events)
  transcript: AgentMessage[];
  // transient live-typing preview from token events
  liveNode: string | null;
  liveText: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  threadId: string | null;
  error: string | null;

  resetRun: () => void;
  setNodeStatus: (node: string, status: NodeStatus) => void;
  applyEvent: (e: StreamEvent) => void;
}

export const useRunStore = create<RunState>((set) => ({
  nodeStatus: {},
  transcript: [],
  liveNode: null,
  liveText: "",
  inputTokens: 0,
  outputTokens: 0,
  totalTokens: 0,
  costUsd: 0,
  threadId: null,
  error: null,

  resetRun: () =>
    set({
      nodeStatus: {},
      transcript: [],
      liveNode: null,
      liveText: "",
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      error: null,
    }),

  setNodeStatus: (node, status) =>
    set((s) => ({ nodeStatus: { ...s.nodeStatus, [node]: status } })),

  applyEvent: (e) =>
    set((s) => {
      switch (e.type) {
        case "node_start":
          return {
            nodeStatus: { ...s.nodeStatus, [e.data.node]: "running" },
          };
        case "token":
          // Tokens only drive the "running" pulse + a live-typing preview.
          // The authoritative transcript is built from agent_message events
          // (reliable + correctly attributed even for non-streaming agents).
          return {
            liveNode: e.data.node,
            liveText: s.liveText + e.data.text,
            nodeStatus: { ...s.nodeStatus, [e.data.node]: "running" },
          };
        case "agent_message":
          return {
            transcript: [
              ...s.transcript,
              { node: e.data.node, text: e.data.text },
            ],
            liveText: "",
            liveNode: null,
          };
        case "node_end":
          return {
            nodeStatus: { ...s.nodeStatus, [e.data.node]: "done" },
          };
        case "usage":
          return {
            inputTokens: Math.max(s.inputTokens, e.data.input_tokens),
            outputTokens: s.outputTokens + e.data.output_tokens,
            totalTokens:
              Math.max(s.inputTokens, e.data.input_tokens) +
              s.outputTokens +
              e.data.output_tokens,
            costUsd: e.data.cost_usd ?? s.costUsd,
          };
        case "error":
          return { error: e.data.message };
        case "done":
          return { threadId: e.data.thread_id };
        default:
          return {};
      }
    }),
}));
