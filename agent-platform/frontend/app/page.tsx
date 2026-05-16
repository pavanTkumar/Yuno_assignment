// Placeholder dashboard (full template gallery built in Phase 5).

import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4">
      <h1 className="text-[28px] font-semibold text-text">
        Agent Orchestration Platform
      </h1>
      <p className="text-[14px] text-text-muted">
        Create agents, wire them into supervisor workflows, run them live.
      </p>
      <Link
        href="/workflows"
        className="rounded-[10px] bg-primary px-4 py-2 text-[14px] font-medium text-primary-fg transition-opacity duration-150 hover:opacity-90"
      >
        Open Workflows →
      </Link>
    </div>
  );
}
