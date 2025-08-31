import axios from "axios";

const BASE_URL = process.env.REACT_APP_BACKEND_URL;

// Axios instance (no hardcoded urls)
export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
});

export function sseUrl(path, query) {
  const qs = new URLSearchParams(query || {}).toString();
  return `${BASE_URL}/api${path}${qs ? `?${qs}` : ""}`;
}

export async function getAgents() {
  const { data } = await api.get("/agents");
  return data;
}
export async function refreshAgents() {
  const { data } = await api.post("/agents/refresh");
  return data;
}
export async function patchAgent(id, payload) {
  const { data } = await api.patch(`/agents/${id}`, payload);
  return data;
}

export async function appendOutput({ sessionId, agentId, content }) {
  const { data } = await api.post("/output/append", { sessionId, agentId, content });
  return data;
}

export async function getHistory(limit = 100) {
  const { data } = await api.get("/history", { params: { limit } });
  return data;
}
export async function createHistory({ agentId, content }) {
  const { data } = await api.post("/history", { agentId, content });
  return data;
}