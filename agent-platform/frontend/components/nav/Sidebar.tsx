// App shell sidebar — logo lockup + active nav state via usePathname.

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/workflows", label: "Workflows" },
  { href: "/agents", label: "Agents" },
  { href: "/runs", label: "Runs" },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col border-r border-border bg-gradient-to-b from-surface to-bg"
      style={{ width: "var(--sidebar-w)" }}
    >
      <div
        className="flex items-center gap-2.5 border-b border-border px-5"
        style={{ height: "var(--header-h)" }}
      >
        <span className="grid h-8 w-8 place-items-center rounded-[8px] bg-gradient-to-br from-primary to-accent text-[15px] font-bold text-primary-fg shadow-[0_4px_14px_-4px_var(--glow-primary)]">
          ⬡
        </span>
        <div className="flex flex-col leading-tight">
          <span className="text-[15px] font-semibold tracking-tight text-text">
            Orchestrator
          </span>
          <span className="text-[11px] text-text-faint">
            Multi-agent platform
          </span>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        <p className="px-3 pb-2 pt-1 text-[11px] font-medium uppercase tracking-wider text-text-faint">
          Workspace
        </p>
        {NAV.map((n) => {
          const active = isActive(pathname, n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`group relative flex items-center rounded-[8px] px-3 py-2 text-[14px] transition-colors duration-150 ${
                active
                  ? "bg-surface-2 font-medium text-text"
                  : "text-text-muted hover:bg-surface-2/60 hover:text-text"
              }`}
            >
              <span
                className={`absolute left-0 h-4 w-[3px] rounded-full bg-accent transition-opacity duration-150 ${
                  active ? "opacity-100" : "opacity-0"
                }`}
              />
              {n.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-5 py-4">
        <div className="flex items-center gap-2 text-[12px] text-text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          API connected
        </div>
      </div>
    </aside>
  );
}
