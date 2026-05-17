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
        className="flex items-center justify-between border-b border-border px-6"
        style={{ height: "var(--header-h)" }}
      >
        <h1 className="text-[18px] font-semibold tracking-tight text-text">
          Dashboard
        </h1>
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-[12px] text-text-muted">
          {workflows.length} workflow{workflows.length === 1 ? "" : "s"}
        </span>
      </header>
      <div className="mx-auto w-full max-w-6xl p-6">
        {err && (
          <p className="mb-4 rounded-[8px] border border-status-error/40 bg-status-error/10 px-3 py-2 text-[13px] text-status-error">
            {err}
          </p>
        )}
        <div className="mb-5">
          <h2 className="text-[15px] font-semibold text-text">
            Workflow templates
          </h2>
          <p className="mt-0.5 text-[13px] text-text-muted">
            Open a template to run it, or clone it to make an editable copy.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((w) => (
            <div
              key={w.id}
              className="group animate-in relative flex flex-col overflow-hidden rounded-[12px] border border-border bg-surface p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-[0_16px_40px_-20px_rgba(0,0,0,0.7)]"
            >
              <span className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent/50 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-[16px] font-semibold tracking-tight text-text">
                  {w.name}
                </h3>
                {w.is_template && (
                  <span className="shrink-0 rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                    template
                  </span>
                )}
              </div>
              <p className="mt-2 flex-1 text-[13px] leading-relaxed text-text-muted">
                {w.description}
              </p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {w.agents.map((a) => (
                  <span
                    key={a.id}
                    className="rounded-[6px] border border-border bg-surface-2 px-2 py-0.5 text-[12px] text-text-muted"
                  >
                    {a.name}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => router.push(`/workflows?id=${w.id}`)}
                  className="h-9 flex-1 rounded-[8px] bg-primary text-[14px] font-medium text-primary-fg transition-colors duration-150 hover:bg-primary-hover"
                >
                  Open
                </button>
                <button
                  onClick={() => clone(w.id)}
                  disabled={busy === w.id}
                  className="h-9 rounded-[8px] border border-border px-4 text-[14px] text-text-muted transition-colors duration-150 hover:border-border-strong hover:bg-surface-2 hover:text-text disabled:opacity-50"
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
