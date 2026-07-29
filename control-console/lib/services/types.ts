export type ServiceOutcome = "ready" | "degraded" | "unavailable" | "unknown";

export interface ServiceSample {
  id: string;
  outcome: ServiceOutcome;
  http_status: number | null;
  latency_ms: number | null;
  summary: string | null;
  details: Record<string, unknown>;
  error: string | null;
  checked_at: string;
}

export interface ServiceMonitor {
  id: string;
  slug: string;
  name: string;
  service_kind: string;
  environment: string;
  endpoint_url: string;
  project_code: string | null;
  project_name: string | null;
  component_code: string | null;
  component_name: string | null;
  latest: ServiceSample | null;
  observedUptime24h: number | null;
  observedUptime7d: number | null;
  samples24h: number;
  samples7d: number;
}

export interface ServicesOverviewPayload {
  generatedAt: string;
  monitors: ServiceMonitor[];
}
