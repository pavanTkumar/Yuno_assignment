// Dashboard — workflow template gallery with clone + open.

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type Workflow } from "@/lib/api";

export default function Dashboard() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  const load = () =>
    api
      .listWorkflows()
      .then(setWorkflows)
      .catch((e) => setErr((e as Error).message));

  useEffect(() => {
    load();
  }, []);

  const clone = async (id: number) => {
    setBusy(id);
    try {
      const w = await api.cloneWorkflow(id);
      router.push(`/workflows?id=${w.id}`);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex flex-col">
      <header
        className="flex items-center border-b border-border px-6 text-[20px] font-semibold text-text"
        style={{ height: "var(--header-h)" }}
      >
        Dashboard
      </header>
      <div className="p-6">
        {err && (
          <p className="mb-4 text-[13px] text-status-error">{err}</p>
        )}
        <h2 className="mb-3 text-[14px] text-text-muted">
          Workflow templates
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((w) => (
            <div
              key={w.id}
              className="flex flex-col rounded-[10px] border border-border bg-surface p-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-[16px] font-semibold text-text">
                  {w.name}
                </h3>
                {w.is_template && (
                  <span className="rounded-[6px] bg-surface-2 px-2 py-0.5 text-[12px] text-text-muted">
                    template
                  </span>
                )}
              </div>
              <p className="mt-2 flex-1 text-[13px] text-text-muted">
                {w.description}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {w.agents.map((a) => (
                  <span
                    key={a.id}
                    className="rounded-[6px] bg-surface-2 px-2 py-0.5 text-[12px] text-text-muted"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => router.push(`/workflows?id=${w.id}`)}
                  className="h-9 flex-1 rounded-[10px] bg-primary text-[14px] font-medium text-primary-fg transition-opacity duration-150 hover:opacity-90"
                >
                  Open
                </button>
                <button
                  onClick={() => clone(w.id)}
                  disabled={busy === w.id}
                  className="h-9 rounded-[10px] border border-border px-4 text-[14px] text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text disabled:opacity-50"
                >
                  {busy === w.id ? "Cloning…" : "Clone"}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
