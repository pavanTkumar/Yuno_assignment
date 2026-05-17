// Agents CRUD — list, create, edit, soft-delete.

"use client";

import { useEffect, useState } from "react";
import { api, type Agent, type ModelsInfo } from "@/lib/api";

const EMPTY: Partial<Agent> = {
  name: "",
  role: "",
  system_prompt: "",
  model: "",
  tools: [],
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [models, setModels] = useState<ModelsInfo | null>(null);
  const [form, setForm] = useState<Partial<Agent>>(EMPTY);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = () =>
    api
      .listAgents()
      .then(setAgents)
      .catch((e) => setErr((e as Error).message));

  useEffect(() => {
    load();
    api.models().then(setModels).catch(() => {});
  }, []);

  const save = async () => {
    if (!form.name || !form.role || !form.system_prompt) return;
    try {
      if (editingId) await api.updateAgent(editingId, form);
      else await api.createAgent(form);
      setForm(EMPTY);
      setEditingId(null);
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const edit = (a: Agent) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      role: a.role,
      system_prompt: a.system_prompt,
      model: a.model,
      tools: a.tools,
    });
  };

  const remove = async (id: number) => {
    await api.deleteAgent(id);
    if (editingId === id) {
      setForm(EMPTY);
      setEditingId(null);
    }
    load();
  };

  const input =
    "h-9 w-full rounded-[8px] border border-border bg-surface-2 px-3 text-[14px] text-text outline-none transition-colors duration-150 placeholder:text-text-faint focus:border-accent";

  return (
    <div className="flex flex-col">
      <header
        className="flex items-center justify-between border-b border-border px-6"
        style={{ height: "var(--header-h)" }}
      >
        <h1 className="text-[18px] font-semibold tracking-tight text-text">
          Agents
        </h1>
        <span className="rounded-full border border-border bg-surface px-3 py-1 text-[12px] text-text-muted">
          {agents.length} agent{agents.length === 1 ? "" : "s"}
        </span>
      </header>
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {err && (
            <p className="rounded-[8px] border border-status-error/40 bg-status-error/10 px-3 py-2 text-[13px] text-status-error">
              {err}
            </p>
          )}
          {agents.length === 0 && !err && (
            <div className="rounded-[12px] border border-dashed border-border bg-surface/50 p-10 text-center text-[13px] text-text-muted">
              No agents yet — create one using the form.
            </div>
          )}
          {agents.map((a) => (
            <div
              key={a.id}
              className="group animate-in flex items-start justify-between gap-4 rounded-[12px] border border-border bg-surface p-4 transition-colors duration-150 hover:border-border-strong"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-status-idle ring-2 ring-status-idle/20" />
                  <span className="text-[14px] font-semibold text-text">
                    {a.name}
                  </span>
                  <span className="rounded-full border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-text-muted">
                    {a.role}
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 max-w-xl text-[13px] leading-relaxed text-text-muted">
                  {a.system_prompt}
                </p>
                <p className="mt-2 font-mono text-[12px] text-text-faint">
                  {a.model}
                  {a.tools.length > 0 && ` · tools: ${a.tools.join(", ")}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-1 opacity-70 transition-opacity duration-150 group-hover:opacity-100">
                <button
                  onClick={() => edit(a)}
                  className="rounded-[6px] px-2.5 py-1 text-[13px] text-text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-text"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="rounded-[6px] px-2.5 py-1 text-[13px] text-status-error transition-colors duration-150 hover:bg-status-error/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="h-fit rounded-[12px] border border-border bg-surface p-5 lg:sticky lg:top-6">
          <h3 className="mb-1 text-[14px] font-semibold text-text">
            {editingId ? "Edit agent" : "New agent"}
          </h3>
          <p className="mb-4 text-[12px] text-text-muted">
            {editingId
              ? "Updating preserves existing conversation threads."
              : "Configure a worker for your workflows."}
          </p>
          <div className="space-y-3">
            <input
              className={input}
              placeholder="Name"
              value={form.name ?? ""}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <input
              className={input}
              placeholder="Role"
              value={form.role ?? ""}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            />
            <textarea
              className={`${input} h-24 py-2`}
              placeholder="System prompt"
              value={form.system_prompt ?? ""}
              onChange={(e) =>
                setForm({ ...form, system_prompt: e.target.value })
              }
            />
            <select
              className={input}
              value={form.model ?? ""}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            >
              <option value="">
                {models ? `default (${models.default})` : "default"}
              </option>
              {models?.models.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-[13px] text-text-muted">
              <input
                type="checkbox"
                checked={(form.tools ?? []).includes("web_search")}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tools: e.target.checked ? ["web_search"] : [],
                  })
                }
              />
              web_search tool
            </label>
            <div className="flex gap-2">
              <button
                onClick={save}
                className="h-9 flex-1 rounded-[10px] bg-primary text-[14px] font-medium text-primary-fg hover:opacity-90"
              >
                {editingId ? "Save" : "Create"}
              </button>
              {editingId && (
                <button
                  onClick={() => {
                    setForm(EMPTY);
                    setEditingId(null);
                  }}
                  className="h-9 rounded-[10px] border border-border px-4 text-[14px] text-text-muted hover:bg-surface-2"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
