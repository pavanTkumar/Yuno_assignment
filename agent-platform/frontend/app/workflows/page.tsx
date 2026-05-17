"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Topology, type Workflow } from "@/lib/api";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { UsageBar } from "@/components/monitor/UsageBar";
import { MonitorDrawer } from "@/components/monitor/MonitorDrawer";

function WorkflowsView() {
  const params = useSearchParams();
  const idParam = params.get("id");
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [topology, setTopology] = useState<Topology | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const workflows = await api.listWorkflows();
        const wf = idParam
          ? workflows.find((w) => w.id === Number(idParam))
          : workflows[0];
        if (!wf) {
          setErr("No workflows found.");
          return;
        }
        setWorkflow(wf);
        setTopology(await api.topology(wf.id));
      } catch (e) {
        setErr((e as Error).message);
      }
    })();
  }, [idParam]);

  if (err)
    return (
      <div className="p-6 text-[14px] text-status-error">Error: {err}</div>
    );
  if (!workflow || !topology)
    return (
      <div className="p-6 text-[14px] text-text-muted">Loading…</div>
    );

  return (
    <div className="flex h-screen flex-col">
      <header
        className="flex items-center justify-between border-b border-border px-6"
        style={{ height: "var(--header-h)" }}
      >
        <div className="flex items-center gap-3">
          <span className="text-[12px] uppercase tracking-wider text-text-faint">
            Workflow
          </span>
          <span className="h-3 w-px bg-border" />
          <h1 className="text-[16px] font-semibold tracking-tight text-text">
            {workflow.name}
          </h1>
        </div>
        {workflow.is_template && (
          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-text-muted">
            template
          </span>
        )}
      </header>
      <UsageBar />
      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1 bg-bg">
          <WorkflowCanvas topology={topology} />
        </div>
        <div className="flex w-100 flex-col border-l border-border bg-surface">
          <div className="min-h-0 flex-1">
            <ChatPanel workflowId={workflow.id} />
          </div>
          <MonitorDrawer />
        </div>
      </div>
    </div>
  );
}

export default function WorkflowsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 text-[14px] text-text-muted">Loading…</div>
      }
    >
      <WorkflowsView />
    </Suspense>
  );
}
