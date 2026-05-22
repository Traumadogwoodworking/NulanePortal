export interface HealthSummary {
  status: "nominal" | "degraded" | "critical";
  monitoredTenants: number;
  averageLatencyMs: number;
  lastSyncedAt: string;
  automationQueueDepth: number;
}

export interface AutomationBlueprint {
  id: string;
  name: string;
  type: string;
  nextRun: string;
  status: "ready" | "running" | "paused";
}

const DEFAULT_HEALTH: HealthSummary = {
  status: "nominal",
  monitoredTenants: 18,
  averageLatencyMs: 124,
  lastSyncedAt: new Date().toISOString(),
  automationQueueDepth: 3
};

const DEFAULT_BLUEPRINTS: AutomationBlueprint[] = [
  {
    id: "blueprint-1",
    name: "Tenant Onboarding Audit",
    type: "audit",
    nextRun: new Date(Date.now() + 1000 * 60 * 45).toISOString(),
    status: "ready"
  },
  {
    id: "blueprint-2",
    name: "Invoice Reconciliation",
    type: "reconciliation",
    nextRun: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
    status: "running"
  },
  {
    id: "blueprint-3",
    name: "Automation Drift Guard",
    type: "guardrail",
    nextRun: new Date(Date.now() + 1000 * 60 * 120).toISOString(),
    status: "paused"
  }
];

export class ControlConsoleClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl ?? process.env.CONTROL_PLANE_API_BASE_URL ?? "https://api.nulanesystems.com";
  }

  private async fetchFromControlPlane<T>(endpoint: string, fallback: T): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Control plane responded with ${response.status}`);
      }

      const payload = (await response.json()) as T;
      return payload;
    } catch (error) {
      console.warn("ControlConsoleClient fallback data used", error);
      return fallback;
    }
  }

  async fetchHealthOverview(): Promise<HealthSummary> {
    return this.fetchFromControlPlane("/health/overview", DEFAULT_HEALTH);
  }

  async fetchAutomationBlueprints(): Promise<AutomationBlueprint[]> {
    return this.fetchFromControlPlane("/automation/blueprints", DEFAULT_BLUEPRINTS);
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }
}
