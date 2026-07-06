import { apiFetch } from "@/lib/apiClient";
import type { RuntimeApiResult, RuntimeDashboardDefinition, RuntimeRenderPayload } from "./types";

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
