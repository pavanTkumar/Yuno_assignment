"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type Topology, type Workflow } from "@/lib/api";
import { WorkflowCanvas } from "@/components/canvas/WorkflowCanvas";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { UsageBar } from "@/components/monitor/UsageBar";

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
        className="flex items-center border-b border-border px-6 text-[20px] font-semibold text-text"
        style={{ height: "var(--header-h)" }}
      >
        {workflow.name}
      </header>
      <UsageBar />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <WorkflowCanvas topology={topology} />
        </div>
        <div className="w-100 border-l border-border bg-surface">
          <ChatPanel workflowId={workflow.id} />
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
