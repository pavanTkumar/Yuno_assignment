// Typed Zustand store: live run state driven by SSE events.

import { create } from "zustand";
import type { StreamEvent } from "./useAgentStream";

export type NodeStatus = "idle" | "running" | "done" | "error";

export interface AgentMessage {
  node: string;
  text: string;
}

interface RunState {
  // node id -> status (drives canvas highlighting)
  nodeStatus: Record<string, NodeStatus>;
  // streamed assistant text, keyed by node (dedup-friendly)
  transcript: AgentMessage[];
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
        case "token": {
          const last = s.transcript[s.transcript.length - 1];
          const transcript =
            last && last.node === e.data.node
              ? [
                  ...s.transcript.slice(0, -1),
                  { node: e.data.node, text: last.text + e.data.text },
                ]
              : [...s.transcript, { node: e.data.node, text: e.data.text }];
          return {
            transcript,
            nodeStatus: { ...s.nodeStatus, [e.data.node]: "running" },
          };
        }
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
