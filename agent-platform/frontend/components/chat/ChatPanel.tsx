// Chat panel — prompt input + live streamed assistant transcript.

"use client";

import { useCallback, useState } from "react";
import { useAgentStream, type StreamEvent } from "@/lib/useAgentStream";
import { useRunStore, dedupeTranscript } from "@/lib/store";

export function ChatPanel({ workflowId }: { workflowId: number }) {
  const [prompt, setPrompt] = useState("");
  const applyEvent = useRunStore((s) => s.applyEvent);
  const resetRun = useRunStore((s) => s.resetRun);
  const rawTranscript = useRunStore((s) => s.transcript);
  const transcript = dedupeTranscript(rawTranscript);
  const liveNode = useRunStore((s) => s.liveNode);
  const liveText = useRunStore((s) => s.liveText);
  const error = useRunStore((s) => s.error);

  const onEvent = useCallback(
    (e: StreamEvent) => applyEvent(e),
    [applyEvent],
  );
  const { start, running } = useAgentStream(onEvent);

  const submit = () => {
    if (!prompt.trim() || running) return;
    resetRun();
    start({ workflow_id: workflowId, prompt });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {transcript.length === 0 && !running && (
          <p className="text-[13px] text-text-muted">
            Enter a prompt to run the workflow. Agents will stream their
            output here and pulse on the canvas.
          </p>
        )}
        {transcript.map((m, i) => (
          <div key={i} className="rounded-[10px] bg-surface-2 p-3">
            <div className="mb-1 text-[12px] font-medium text-accent">
              {m.node}
            </div>
            <div className="whitespace-pre-wrap text-[14px] text-text">
              {m.text}
            </div>
          </div>
        ))}
        {running && liveText && (
          <div className="rounded-[10px] bg-surface-2/60 p-3">
            <div className="mb-1 text-[12px] font-medium text-accent">
              {liveNode} <span className="text-text-muted">· typing…</span>
            </div>
            <div className="whitespace-pre-wrap text-[14px] text-text-muted">
              {liveText.slice(-600)}
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-[10px] border border-status-error p-3 text-[13px] text-status-error">
            {error}
          </div>
        )}
      </div>
      <div className="border-t border-border p-3">
        <div className="flex gap-2">
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Write a brief report on LangGraph 1.0"
            className="h-9 flex-1 rounded-[10px] border border-border bg-surface-2 px-3 text-[14px] text-text outline-none focus:border-accent"
          />
          <button
            onClick={submit}
            disabled={running}
            className="h-9 rounded-[10px] bg-primary px-4 text-[14px] font-medium text-primary-fg transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
          >
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </div>
    </div>
  );
}
