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
    "h-9 w-full rounded-[10px] border border-border bg-surface-2 px-3 text-[14px] text-text outline-none focus:border-accent";

  return (
    <div className="flex flex-col">
      <header
        className="flex items-center border-b border-border px-6 text-[20px] font-semibold text-text"
        style={{ height: "var(--header-h)" }}
      >
        Agents
      </header>
      <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {err && (
            <p className="text-[13px] text-status-error">{err}</p>
          )}
          {agents.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between rounded-[10px] border border-border bg-surface p-4"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-block h-2 w-2 rounded-full bg-status-idle" />
                  <span className="text-[14px] font-semibold text-text">
                    {a.name}
                  </span>
                  <span className="rounded-[6px] bg-surface-2 px-2 py-0.5 text-[12px] text-text-muted">
                    {a.role}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 max-w-xl text-[13px] text-text-muted">
                  {a.system_prompt}
                </p>
                <p className="mt-1 font-mono text-[12px] text-text-muted">
                  {a.model}
                  {a.tools.length > 0 && ` · tools: ${a.tools.join(", ")}`}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => edit(a)}
                  className="rounded-[6px] px-2 py-1 text-[13px] text-text-muted hover:bg-surface-2 hover:text-text"
                >
                  Edit
                </button>
                <button
                  onClick={() => remove(a.id)}
                  className="rounded-[6px] px-2 py-1 text-[13px] text-status-error hover:bg-surface-2"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-[10px] border border-border bg-surface p-5">
          <h3 className="mb-3 text-[14px] font-semibold text-text">
            {editingId ? "Edit agent" : "New agent"}
          </h3>
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
