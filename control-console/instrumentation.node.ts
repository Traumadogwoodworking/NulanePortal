import { ensureSchema } from "@lib/db";
import { syncServiceMonitors } from "@lib/services/sync";

declare global {
  var __nulaneServiceMonitorTimer: ReturnType<typeof setInterval> | undefined;
}

const intervalMs = Math.max(
  15_000,
  Number(process.env.SERVICE_MONITOR_INTERVAL_MS ?? 60_000)
);

async function sampleServices() {
  try {
    await ensureSchema();
    const result = await syncServiceMonitors();
    const outcomes = result.monitors
      .map((monitor) => `${monitor.slug}:${monitor.outcome}`)
      .join(", ");
    console.log(`[service-monitor ${result.checkedAt}] ${outcomes}`);
  } catch (error) {
    console.error(
      `Service monitor cycle failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function registerNodeInstrumentation() {
  if (globalThis.__nulaneServiceMonitorTimer) return;
  await sampleServices();
  globalThis.__nulaneServiceMonitorTimer = setInterval(
    () => void sampleServices(),
    intervalMs
  );
}
