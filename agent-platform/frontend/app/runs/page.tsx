// Runs — persisted run history (status, tokens, cost, thread).

"use client";

import { useEffect, useState } from "react";
import { api, type Run } from "@/lib/api";

const STATUS_COLOR: Record<string, string> = {
  completed: "text-success",
  running: "text-status-running",
  error: "text-status-error",
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
        className="flex items-center border-b border-border px-6 text-[20px] font-semibold text-text"
        style={{ height: "var(--header-h)" }}
      >
        Runs
      </header>
      <div className="p-6">
        {err && <p className="text-[13px] text-status-error">{err}</p>}
        {runs.length === 0 && !err && (
          <p className="text-[13px] text-text-muted">No runs yet.</p>
        )}
        <div className="overflow-hidden rounded-[10px] border border-border">
          <table className="w-full text-[13px]">
            <thead className="bg-surface text-text-muted">
              <tr>
                {["ID", "Prompt", "Status", "Tokens", "Cost", "Thread"].map(
                  (h) => (
                    <th key={h} className="px-4 py-2 text-left font-medium">
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
                  className="border-t border-border bg-surface-2/40"
                >
                  <td className="px-4 py-2 font-mono text-text-muted">
                    {r.id}
                  </td>
                  <td className="max-w-md truncate px-4 py-2 text-text">
                    {r.prompt}
                  </td>
                  <td
                    className={`px-4 py-2 ${
                      STATUS_COLOR[r.status] ?? "text-text-muted"
                    }`}
                  >
                    {r.status}
                  </td>
                  <td className="px-4 py-2 font-mono text-text-muted">
                    {r.total_tokens.toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-text-muted">
                    ${r.cost_usd.toFixed(4)}
                  </td>
                  <td className="px-4 py-2 font-mono text-text-muted">
                    {r.thread_id}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
