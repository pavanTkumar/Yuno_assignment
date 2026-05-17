import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/nav/Sidebar";

export const metadata: Metadata = {
  title: "Agent Orchestration Platform",
  description: "Create, connect, and run multi-agent workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full">
        <Sidebar />
        <main className="flex min-h-full flex-1 flex-col">{children}</main>
      </body>
    </html>
  );
}
