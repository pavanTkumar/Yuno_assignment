// The ONLY SSE consumer. Components never touch fetch-streams / EventSource.

import { useCallback, useRef, useState } from "react";
import { api } from "./api";

export type StreamEvent =
  | { type: "node_start"; data: { node: string } }
  | { type: "node_end"; data: { node: string; text: string } }
  | { type: "agent_message"; data: { node: string; text: string } }
  | { type: "token"; data: { node: string; text: string } }
  | {
      type: "usage";
      data: {
        input_tokens: number;
        output_tokens: number;
        total_tokens: number;
        cost_usd?: number;
        run_id?: number;
      };
    }
  | { type: "error"; data: { message: string } }
  | { type: "done"; data: { thread_id: string } }
  | { type: "custom"; data: { node: string; payload: unknown } };

export interface RunRequest {
  workflow_id: number;
  prompt: string;
  thread_id?: string;
}

function parseSSE(buffer: string): { events: StreamEvent[]; rest: string } {
  const events: StreamEvent[] = [];
  const frames = buffer.split("\n\n");
  const rest = frames.pop() ?? "";
  for (const frame of frames) {
    let type = "";
    let data = "";
    for (const line of frame.split("\n")) {
      if (line.startsWith("event:")) type = line.slice(6).trim();
      else if (line.startsWith("data:")) data += line.slice(5).trim();
    }
    if (!type) continue;
    try {
      events.push({ type, data: JSON.parse(data || "{}") } as StreamEvent);
    } catch {
      /* ignore malformed frame */
    }
  }
  return { events, rest };
}

export function useAgentStream(onEvent: (e: StreamEvent) => void) {
  const [running, setRunning] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback(
    async (req: RunRequest) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setRunning(true);
      try {
        const res = await fetch(api.runUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(req),
          signal: ac.signal,
        });
        if (!res.body) throw new Error("No response stream");
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const { events, rest } = parseSSE(buf);
          buf = rest;
          for (const e of events) onEvent(e);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          onEvent({
            type: "error",
            data: { message: (err as Error).message },
          });
        }
      } finally {
        setRunning(false);
      }
    },
    [onEvent],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  return { start, stop, running };
}
