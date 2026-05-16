// Live token + cost counter (DESIGN.md card pattern).

"use client";

import { useRunStore } from "@/lib/store";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[12px] text-text-muted">{label}</span>
      <span className="font-mono text-[14px] text-text">{value}</span>
    </div>
  );
}

export function UsageBar() {
  const { inputTokens, outputTokens, totalTokens, costUsd } = useRunStore();
  return (
    <div className="flex items-center gap-6 border-b border-border bg-surface px-4 py-2">
      <Stat label="Input" value={inputTokens.toLocaleString()} />
      <Stat label="Output" value={outputTokens.toLocaleString()} />
      <Stat label="Total" value={totalTokens.toLocaleString()} />
      <Stat label="Cost (USD)" value={`$${costUsd.toFixed(4)}`} />
    </div>
  );
}
