const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

function setToken(token: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
}

function clearToken() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers || {});
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || "Requête échouée");
  }
  return response.json() as Promise<T>;
}

function buildQuery(params: Record<string, string | undefined | null>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const value = query.toString();
  return value ? `?${value}` : "";
}

export async function login(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Connexion impossible");
  setToken(data.access_token);
  return data;
}

export async function register(payload: Record<string, string>) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Inscription impossible");
  setToken(data.access_token);
  return data;
}

export async function getMe() {
  return request<any>("/auth/me");
}

export async function uploadFile(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  const token = getToken();
  const response = await fetch(`${API_BASE_URL}/files/upload`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || "Upload impossible");
  return data;
}

export async function getHistory() {
  return request<any[]>("/files/history");
}

export type AnalysisFilters = {
  start_date?: string;
  end_date?: string;
  ville?: string;
  canal?: string;
  client?: string;
  produit?: string;
  vendeur?: string;
};

export async function getAnalysis(fileId: number, filters: AnalysisFilters = {}) {
  return request<any>(`/files/${fileId}/analysis${buildQuery(filters)}`);
}

export async function getDatasetDetail(fileId: number) {
  return request<any>(`/files/${fileId}/detail`);
}

export async function cleanDataset(fileId: number) {
  return request<any>(`/files/${fileId}/clean`, { method: "POST" });
}

export function exportUrl(fileId: number, format: "csv" | "excel" | "pdf", filters: AnalysisFilters = {}) {
  return `${API_BASE_URL}/exports/${fileId}/${format}${buildQuery(filters)}`;
}

export async function downloadExport(fileId: number, format: "csv" | "excel" | "pdf", filters: AnalysisFilters = {}) {
  const token = getToken();
  const response = await fetch(exportUrl(fileId, format, filters), {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Export impossible");
  const blob = await response.blob();
  const disposition = response.headers.get("content-disposition") || "";
  const match = disposition.match(/filename=([^;]+)/i);
  const fallbackExtension = format === "excel" ? "xlsx" : format;
  const filename = match?.[1]?.replaceAll('"', "") || `datapilot_pme_export.${fallbackExtension}`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export async function askAssistant(question: string, fileId?: number) {
  return request<any>("/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, file_id: fileId }),
  });
}

export async function getProfile() {
  return request<any>("/profile");
}

export async function updateProfile(payload: Record<string, string>) {
  return request<any>("/profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export { clearToken, getToken };