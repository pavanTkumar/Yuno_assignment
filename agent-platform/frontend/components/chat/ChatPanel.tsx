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

  // Stable accent hue per agent label — distinct, on-brand bubble identity.
  const hueFor = (node: string) => {
    let h = 0;
    for (let i = 0; i < node.length; i++)
      h = (h * 31 + node.charCodeAt(i)) % 360;
    return h;
  };
  const accentStyle = (node: string) => {
    const h = hueFor(node);
    return {
      color: `hsl(${h} 70% 70%)`,
      background: `hsl(${h} 70% 60%)`,
    };
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <span className="text-[12px] font-medium uppercase tracking-wider text-text-faint">
          Conversation
        </span>
        {running && (
          <span className="flex items-center gap-1.5 text-[11px] text-status-running">
            <span className="h-1.5 w-1.5 rounded-full bg-status-running cursor-blink" />
            streaming
          </span>
        )}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {transcript.length === 0 && !running && (
          <div className="rounded-[12px] border border-dashed border-border bg-surface-2/40 p-5 text-[13px] leading-relaxed text-text-muted">
            Enter a prompt to run the workflow. Agents will stream their
            output here and pulse on the canvas.
          </div>
        )}
        {transcript.map((m, i) => (
          <div
            key={i}
            className="animate-in rounded-[12px] border border-border bg-surface-2 p-3"
          >
            <div className="mb-1.5 flex items-center gap-2">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: accentStyle(m.node).background }}
              />
              <span
                className="text-[12px] font-semibold"
                style={{ color: accentStyle(m.node).color }}
              >
                {m.node}
              </span>
            </div>
            <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-text">
              {m.text}
            </div>
          </div>
        ))}
        {running && liveText && (
          <div className="animate-in rounded-[12px] border border-status-running/30 bg-surface-2/50 p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-status-running cursor-blink" />
              <span className="text-[12px] font-semibold text-status-running">
                {liveNode}
              </span>
              <span className="text-[12px] text-text-faint">
                typing…
              </span>
            </div>
            <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-text-muted">
              {liveText.slice(-600)}
              <span className="cursor-blink text-status-running">▋</span>
            </div>
          </div>
        )}
        {error && (
          <div className="rounded-[12px] border border-status-error/40 bg-status-error/10 p-3 text-[13px] text-status-error">
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
            className="h-10 flex-1 rounded-[8px] border border-border bg-surface-2 px-3 text-[14px] text-text outline-none transition-colors duration-150 placeholder:text-text-faint focus:border-accent"
          />
          <button
            onClick={submit}
            disabled={running}
            className="h-10 rounded-[8px] bg-primary px-5 text-[14px] font-medium text-primary-fg transition-colors duration-150 hover:bg-primary-hover disabled:opacity-50"
          >
            {running ? "Running…" : "Run"}
          </button>
        </div>
      </div>
    </div>
  );
}
