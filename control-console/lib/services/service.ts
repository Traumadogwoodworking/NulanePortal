import { query } from "@lib/db";
import type { ServiceMonitor, ServiceSample, ServicesOverviewPayload } from "@lib/services/types";

interface MonitorRow extends Omit<ServiceMonitor, "latest" | "observedUptime24h" | "observedUptime7d" | "samples24h" | "samples7d"> {
  latest_id: string | null;
  latest_outcome: ServiceSample["outcome"] | null;
  latest_http_status: number | null;
  latest_latency_ms: number | null;
  latest_summary: string | null;
  latest_details: Record<string, unknown> | null;
  latest_error: string | null;
  latest_checked_at: string | null;
  ready_24h: number;
  samples_24h: number;
  ready_7d: number;
  samples_7d: number;
}

export async function getServicesOverview(): Promise<ServicesOverviewPayload> {
  const result = await query<MonitorRow>(
    `SELECT
       m.id, m.slug, m.name, m.service_kind, m.environment, m.endpoint_url,
       p.code AS project_code, p.name AS project_name,
       c.code AS component_code, c.name AS component_name,
       latest.id::text AS latest_id, latest.outcome AS latest_outcome,
       latest.http_status AS latest_http_status, latest.latency_ms AS latest_latency_ms,
       latest.summary AS latest_summary, latest.details AS latest_details,
       latest.error AS latest_error, latest.checked_at::text AS latest_checked_at,
       COALESCE(sample_window.ready_24h, 0)::int AS ready_24h,
       COALESCE(sample_window.samples_24h, 0)::int AS samples_24h,
       COALESCE(sample_window.ready_7d, 0)::int AS ready_7d,
       COALESCE(sample_window.samples_7d, 0)::int AS samples_7d
     FROM service_monitors m
     LEFT JOIN projects p ON p.id = m.project_id
     LEFT JOIN product_components c ON c.id = m.component_id
     LEFT JOIN LATERAL (
       SELECT * FROM service_check_samples
       WHERE monitor_id = m.id
       ORDER BY checked_at DESC
       LIMIT 1
     ) latest ON true
     LEFT JOIN LATERAL (
       SELECT
         count(*) FILTER (WHERE checked_at >= now() - interval '24 hours' AND outcome = 'ready') AS ready_24h,
         count(*) FILTER (WHERE checked_at >= now() - interval '24 hours') AS samples_24h,
         count(*) FILTER (WHERE checked_at >= now() - interval '7 days' AND outcome = 'ready') AS ready_7d,
         count(*) FILTER (WHERE checked_at >= now() - interval '7 days') AS samples_7d
       FROM service_check_samples
       WHERE monitor_id = m.id
     ) sample_window ON true
     WHERE m.active = true
     ORDER BY m.display_order, m.name`
  );

  return {
    generatedAt: new Date().toISOString(),
    monitors: result.rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      service_kind: row.service_kind,
      environment: row.environment,
      endpoint_url: row.endpoint_url,
      project_code: row.project_code,
      project_name: row.project_name,
      component_code: row.component_code,
      component_name: row.component_name,
      latest: row.latest_id
        ? {
            id: row.latest_id,
            outcome: row.latest_outcome ?? "unknown",
            http_status: row.latest_http_status,
            latency_ms: row.latest_latency_ms,
            summary: row.latest_summary,
            details: row.latest_details ?? {},
            error: row.latest_error,
            checked_at: row.latest_checked_at ?? new Date(0).toISOString()
          }
        : null,
      observedUptime24h: row.samples_24h
        ? Number(((row.ready_24h / row.samples_24h) * 100).toFixed(2))
        : null,
      observedUptime7d: row.samples_7d
        ? Number(((row.ready_7d / row.samples_7d) * 100).toFixed(2))
        : null,
      samples24h: row.samples_24h,
      samples7d: row.samples_7d
    }))
  };
}

export async function getServiceBySlug(slug: string) {
  const overview = await getServicesOverview();
  return overview.monitors.find((monitor) => monitor.slug === slug) ?? null;
}
