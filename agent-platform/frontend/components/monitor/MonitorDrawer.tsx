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
        className="flex w-full items-center justify-between px-4 py-2 text-[13px] text-text-muted hover:text-text"
      >
        <span>
          Inter-agent messages{" "}
          <span className="text-text-muted">({transcript.length})</span>
        </span>
        <span>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="max-h-64 space-y-2 overflow-y-auto px-4 pb-3">
          {transcript.length === 0 && (
            <p className="text-[12px] text-text-muted">
              No messages yet — run a workflow to see agent hand-offs.
            </p>
          )}
          {transcript.map((m, i) => (
            <div
              key={i}
              className="rounded-[6px] border border-border bg-surface-2 p-2"
            >
              <div className="mb-1 font-mono text-[11px] text-accent">
                {m.node}
              </div>
              <div className="whitespace-pre-wrap text-[12px] text-text-muted">
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
