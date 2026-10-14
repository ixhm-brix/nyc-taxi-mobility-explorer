// api.js — NYC Taxi backend API client
const API_BASE = "/api";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function buildQuery(params = {}) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, v);
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

const api = {
  isMock() { return false; },
  meta() { return fetchJSON(`${API_BASE}/meta`); },
  summary(p) { return fetchJSON(`${API_BASE}/summary${buildQuery(p)}`); },
  insights(p) { return fetchJSON(`${API_BASE}/insights${buildQuery(p)}`); },
  daily(p) { return fetchJSON(`${API_BASE}/timeseries/daily${buildQuery(p)}`); },
  hourly(p) { return fetchJSON(`${API_BASE}/timeseries/hourly${buildQuery(p)}`); },
  byDistance(p) { return fetchJSON(`${API_BASE}/breakdown/distance${buildQuery(p)}`); },
  zoneRank(p, metric, order) { return fetchJSON(`${API_BASE}/zones/rank${buildQuery({ ...p, metric, order })}`); },
  topRoutes(p, metric, order) { return fetchJSON(`${API_BASE}/routes/top${buildQuery({ ...p, by: metric, order })}`); },
  trips(p, sort, dir, page = 1) { return fetchJSON(`${API_BASE}/trips${buildQuery({ ...p, sort, order: dir, page })}`); },
  trip(id) { return fetchJSON(`${API_BASE}/trips/${id}`); },
  quality() { return fetchJSON(`${API_BASE}/quality`); },
};
// verified backend API endpoints and query helpers