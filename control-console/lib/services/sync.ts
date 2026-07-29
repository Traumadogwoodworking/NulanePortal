import { query, withTransaction } from "@lib/db";
import type { ServiceOutcome } from "@lib/services/types";

type MonitorRow = {
  id: string;
  slug: string;
  endpoint_url: string;
  expected_http_status: number;
};

function safeDetails(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return {};
  const source = body as Record<string, unknown>;
  const selected: Record<string, unknown> = {};
  for (const key of ["service", "environment", "env", "status", "ready", "summary", "checks", "uptimeSeconds", "alerting"]) {
    if (key in source) selected[key] = source[key];
  }
  return selected;
}

async function probe(monitor: MonitorRow) {
  const startedAt = performance.now();
  try {
    const response = await fetch(monitor.endpoint_url, {
      redirect: "follow",
      signal: AbortSignal.timeout(15_000),
      headers: { Accept: "application/json, text/html;q=0.8, */*;q=0.5" }
    });
    const text = await response.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
    const payload = safeDetails(body);
    const declared = typeof payload.status === "string" ? payload.status.toLowerCase() : null;
    const readyFlag = payload.ready;
    const outcome: ServiceOutcome = response.status === monitor.expected_http_status && readyFlag !== false && !["error", "failed", "degraded", "not_ready"].includes(declared ?? "")
      ? "ready"
      : "degraded";
    return {
      outcome,
      httpStatus: response.status,
      latencyMs: Math.round(performance.now() - startedAt),
      summary: typeof payload.summary === "string" ? payload.summary : declared ?? `HTTP ${response.status}`,
      details: payload,
      error: null
    };
  } catch (error) {
    return {
      outcome: "unavailable" as const,
      httpStatus: null,
      latencyMs: Math.round(performance.now() - startedAt),
      summary: "Probe unavailable",
      details: {},
      error: error instanceof Error ? error.message : "Probe failed"
    };
  }
}

export async function syncServiceMonitors(slugs?: string[]) {
  const monitors = await query<MonitorRow>(
    `SELECT id, slug, endpoint_url, expected_http_status
     FROM service_monitors
     WHERE active = true
       AND ($1::text[] IS NULL OR slug = ANY($1::text[]))
     ORDER BY display_order, name`,
    [slugs?.length ? slugs : null]
  );
  const results = [] as Array<Record<string, unknown>>;
  for (const monitor of monitors.rows) {
    const check = await probe(monitor);
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO service_check_samples (
           monitor_id, outcome, http_status, latency_ms, summary, details, error
         ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)`,
        [
          monitor.id,
          check.outcome,
          check.httpStatus,
          check.latencyMs,
          check.summary,
          JSON.stringify(check.details),
          check.error
        ]
      );
    });
    results.push({ slug: monitor.slug, ...check });
  }
  return { checkedAt: new Date().toISOString(), monitors: results };
}
