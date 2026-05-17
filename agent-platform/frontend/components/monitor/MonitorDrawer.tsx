// Collapsible inter-agent message log (CLAUDE.md monitoring requirement).

"use client";

import { useState } from "react";
import { useRunStore } from "@/lib/store";

export function MonitorDrawer() {
  const [open, setOpen] = useState(false);
  const transcript = useRunStore((s) => s.transcript);

  return (
    <div className="border-t border-border bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-2.5 text-[13px] text-text-muted transition-colors duration-150 hover:text-text"
      >
        <span className="flex items-center gap-2">
          <span className="font-medium uppercase tracking-wider text-text-faint text-[12px]">
            Inter-agent messages
          </span>
          <span className="rounded-full border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] tabular-nums text-text-muted">
            {transcript.length}
          </span>
        </span>
        <span
          className={`text-text-faint transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        >
          ▸
        </span>
      </button>
      {open && (
        <div className="max-h-64 space-y-2 overflow-y-auto px-4 pb-3">
          {transcript.length === 0 && (
            <p className="rounded-[6px] border border-dashed border-border bg-surface-2/40 p-3 text-[12px] text-text-muted">
              No messages yet — run a workflow to see agent hand-offs.
            </p>
          )}
          {transcript.map((m, i) => (
            <div
              key={i}
              className="animate-in rounded-[8px] border border-border bg-surface-2 p-2.5"
            >
              <div className="mb-1 font-mono text-[11px] font-medium text-accent">
                {m.node}
              </div>
              <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-text-muted">
                {m.text.slice(0, 600)}
                {m.text.length > 600 ? "…" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
