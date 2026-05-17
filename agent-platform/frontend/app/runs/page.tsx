// Runs — persisted run history (status, tokens, cost, thread).

"use client";

import { useEffect, useState } from "react";
import { api, type Run } from "@/lib/api";

const STATUS_PILL: Record<string, string> = {
  completed: "border-success/40 bg-success/10 text-success",
  running: "border-status-running/40 bg-status-running/10 text-status-running",
  error: "border-status-error/40 bg-status-error/10 text-status-error",
};

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .listRuns()
      .then(setRuns)
      .catch((e) => setErr((e as Error).message));
  }, []);

  return (
    <div className="flex flex-col">
      <header
        className="flex items-center justify-between border-b border-border px-6"
        style={{ height: "var(--header-h)" }}
      >
        <h1 className="text-[18px] font-semibold tracking-tight text-text">
          Runs
        </h1>
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-[12px] text-text-muted">
          {runs.length} run{runs.length === 1 ? "" : "s"}
        </span>
      </header>
      <div className="mx-auto w-full max-w-6xl p-6">
        {err && (
          <p className="mb-4 rounded-[8px] border border-status-error/40 bg-status-error/10 px-3 py-2 text-[13px] text-status-error">
            {err}
          </p>
        )}
        {runs.length === 0 && !err ? (
          <div className="rounded-[12px] border border-dashed border-border bg-surface/50 p-10 text-center text-[13px] text-text-muted">
            No runs yet — execute a workflow to see its history here.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-text-muted">
                  {["ID", "Prompt", "Status", "Tokens", "Cost", "Thread"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/60 transition-colors duration-150 last:border-0 odd:bg-surface-2/20 hover:bg-surface-2/50"
                  >
                    <td className="px-4 py-3 font-mono text-text-faint">
                      {r.id}
                    </td>
                    <td className="max-w-md truncate px-4 py-3 text-text">
                      {r.prompt}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${
                          STATUS_PILL[r.status] ??
                          "border-border bg-surface-2 text-text-muted"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-text-muted">
                      {r.total_tokens.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-text-muted">
                      ${r.cost_usd.toFixed(4)}
                    </td>
                    <td className="px-4 py-3 font-mono text-text-faint">
                      {r.thread_id}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
