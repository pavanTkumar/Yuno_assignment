// Live token + cost counter (DESIGN.md card pattern).

"use client";

import { useRunStore } from "@/lib/store";

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-[8px] border border-border bg-surface-2 px-3 py-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-text-faint">
        {label}
      </span>
      <span
        className={`font-mono text-[14px] tabular-nums ${
          accent ? "text-accent" : "text-text"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

export function UsageBar() {
  const { inputTokens, outputTokens, totalTokens, costUsd } = useRunStore();
  return (
    <div className="flex items-center gap-2 border-b border-border bg-surface px-4 py-2.5">
      <Stat label="Input" value={inputTokens.toLocaleString()} />
      <Stat label="Output" value={outputTokens.toLocaleString()} />
      <Stat label="Total" value={totalTokens.toLocaleString()} />
      <Stat label="Cost USD" value={`$${costUsd.toFixed(4)}`} accent />
    </div>
  );
}
