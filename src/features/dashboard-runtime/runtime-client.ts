import { apiFetch } from "@/lib/apiClient";
import type { RuntimeApiResult, RuntimeCatalog, RuntimeDashboardDefinition, RuntimeDocs, RuntimeRenderPayload } from "./types";

const defaultBase = "/api/analytics";

export function getRuntimeBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_ANALYTICS_RUNTIME_BASE_URL || defaultBase).replace(/\/$/, "");
}

export async function listRuntimeDashboards(): Promise<RuntimeApiResult<{ dashboards: unknown[] }>> {
  return runtimeRequest("/dashboards");
}

export async function renderRuntimeDashboard(slug: string, filters: Record<string, unknown> = {}): Promise<RuntimeApiResult<RuntimeRenderPayload>> {
  return runtimeRequest(`/dashboards/${encodeURIComponent(slug)}/render`, {
    method: "POST",
    body: JSON.stringify({ filters }),
  });
}

export async function registerRuntimeDashboard(definition: RuntimeDashboardDefinition): Promise<RuntimeApiResult<{ dashboard: unknown; validation?: unknown }>> {
  return runtimeRequest("/dashboards/register", {
    method: "POST",
    body: JSON.stringify(definition),
  });
}

export async function listRuntimeRuns(): Promise<RuntimeApiResult<{ runs: unknown[] }>> {
  return runtimeRequest("/runs");
}

export async function getRuntimeStatus(): Promise<RuntimeApiResult<Record<string, unknown>>> {
  const base = getRuntimeBaseUrl();
  if (base.startsWith("/api/analytics")) {
    return apiFetch<Record<string, unknown>>("/runtime/status");
  }
  const runtimeRoot = base.replace(/\/api\/analytics$/, "");
  const response = await fetch(`${runtimeRoot}/api/runtime/status`, {
    headers: { "Content-Type": "application/json" },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Runtime status request failed with ${response.status}`);
  }
  return payload as RuntimeApiResult<Record<string, unknown>>;
}

export async function getRuntimeCatalog(): Promise<RuntimeApiResult<{ catalog: RuntimeCatalog }>> {
  const base = getRuntimeBaseUrl();
  if (base.startsWith("/api/analytics")) {
    return apiFetch<RuntimeApiResult<{ catalog: RuntimeCatalog }>>("/analytics/catalog");
  }
  const runtimeRoot = base.replace(/\/api\/analytics$/, "");
  const response = await fetch(`${runtimeRoot}/api/runtime/catalog`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Runtime catalog request failed with ${response.status}`);
  }
  return payload as RuntimeApiResult<{ catalog: RuntimeCatalog }>;
}

export async function getRuntimeDocs(): Promise<RuntimeApiResult<{ docs: RuntimeDocs }>> {
  const base = getRuntimeBaseUrl();
  if (base.startsWith("/api/analytics")) {
    return apiFetch<RuntimeApiResult<{ docs: RuntimeDocs }>>("/analytics/docs");
  }
  const runtimeRoot = base.replace(/\/api\/analytics$/, "");
  const response = await fetch(`${runtimeRoot}/api/runtime/docs`, {
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Runtime docs request failed with ${response.status}`);
  }
  return payload as RuntimeApiResult<{ docs: RuntimeDocs }>;
}

async function runtimeRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getRuntimeBaseUrl();
  if (base.startsWith("/api/analytics")) {
    return apiFetch<T>(`/analytics${path}`, options);
  }
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Analytics runtime request failed with ${response.status}`);
  }
  return payload as T;
}
