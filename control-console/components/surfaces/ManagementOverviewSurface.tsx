import { Badge } from "@components/ui/Badge";
import { Card } from "@components/ui/Card";
import { MetricGrid } from "@components/ui/MetricGrid";
import { ControlSurfaceDefinition } from "@lib/types/control-surface";

function formatLatency(latencyMs: number) {
  if (latencyMs > 1000) {
    return `${(latencyMs / 1000).toFixed(1)}s`;
  }
  return `${latencyMs}ms`;
}

const HEALTH_TONE_MAP: Record<string, "success" | "warning" | "muted"> = {
  nominal: "success",
  degraded: "warning",
  critical: "warning"
};

export const managementOverviewSurface: ControlSurfaceDefinition = {
  key: "management-overview",
  title: "Control Plane Health",
  description: "Surface visibility into the overall latency, queue depth, and tenant coverage.",
  category: "Operations",
  icon: "📡",
  priority: 20,
  component: async ({ client }) => {
    const health = await client.fetchHealthOverview();
    const metrics = [
      {
        label: "Monitored Tenants",
        value: `${health.monitoredTenants}`,
        detail: "Across all regions"
      },
      {
        label: "Average Latency",
        value: formatLatency(health.averageLatencyMs),
        detail: "API call round trip"
      },
      {
        label: "Automation Queue",
        value: `${health.automationQueueDepth}`,
        detail: "Queued playbooks"
      },
      {
        label: "Last Sync",
        value: new Date(health.lastSyncedAt).toLocaleString(),
        detail: "Times are UTC"
      }
    ];

    return (
      <Card>
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xl font-semibold text-white">Operational health</p>
            <p className="text-sm text-slate-400">Snapshot of telemetry coming from the control plane API.</p>
          </div>
          <Badge tone={HEALTH_TONE_MAP[health.status]}>{health.status}</Badge>
        </div>
        <div className="mt-5">
          <MetricGrid metrics={metrics} />
        </div>
      </Card>
    );
  }
};
