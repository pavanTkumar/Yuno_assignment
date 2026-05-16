// Typed API client. ALL HTTP goes through here (no raw fetch in components).

const BASE =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8000";

export interface AgentSummary {
  id: number;
  name: string;
  role: string;
}

export interface Agent {
  id: number;
  name: string;
  role: string;
  system_prompt: string;
  model: string;
  tools: string[];
  workflow_id: number | null;
}

export interface Workflow {
  id: number;
  name: string;
  description: string;
  supervisor_prompt: string;
  is_template: boolean;
  agents: AgentSummary[];
}

export interface GraphNode {
  id: string;
  label: string;
  role: string;
  kind: "supervisor" | "agent";
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface Topology {
  workflow_id: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Run {
  id: number;
  workflow_id: number;
  thread_id: string;
  prompt: string;
  status: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  started_at: string;
  finished_at: string | null;
}

export interface ModelsInfo {
  provider: string;
  models: string[];
  default: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return (await res.json()) as T;
}

async function send<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} ${path} failed: ${res.status}`);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const api = {
  base: BASE,
  listWorkflows: () => get<Workflow[]>("/workflows"),
  getWorkflow: (id: number) => get<Workflow>(`/workflows/${id}`),
  cloneWorkflow: (id: number) =>
    send<Workflow>("POST", `/workflows/${id}/clone`),
  topology: (workflowId: number) =>
    get<Topology>(`/graph/topology?workflow_id=${workflowId}`),
  listAgents: () => get<Agent[]>("/agents"),
  models: () => get<ModelsInfo>("/agents/models"),
  createAgent: (body: Partial<Agent>) =>
    send<Agent>("POST", "/agents", body),
  updateAgent: (id: number, body: Partial<Agent>) =>
    send<Agent>("PATCH", `/agents/${id}`, body),
  deleteAgent: (id: number) => send<void>("DELETE", `/agents/${id}`),
  listRuns: () => get<Run[]>("/runs"),
  getRun: (id: number) => get<Run>(`/runs/${id}`),
  runUrl: () => `${BASE}/runs`,
};
