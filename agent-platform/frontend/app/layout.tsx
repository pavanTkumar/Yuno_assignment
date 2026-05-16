import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Orchestration Platform",
  description: "Create, connect, and run multi-agent workflows.",
};

const NAV = [
  { href: "/", label: "Dashboard" },
  { href: "/workflows", label: "Workflows" },
  { href: "/agents", label: "Agents" },
  { href: "/runs", label: "Runs" },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full">
        <aside
          className="flex flex-col border-r border-border bg-surface"
          style={{ width: "var(--sidebar-w)" }}
        >
          <div className="flex items-center px-5 text-[20px] font-semibold text-text"
               style={{ height: "var(--header-h)" }}>
            ⬡ Orchestrator
          </div>
          <nav className="flex flex-col gap-1 p-3">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-[10px] px-3 py-2 text-[14px] text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </aside>
        <main className="flex min-h-full flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
