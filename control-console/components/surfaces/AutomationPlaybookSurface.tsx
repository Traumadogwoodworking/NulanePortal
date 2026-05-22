import { Badge } from "@components/ui/Badge";
import { Button } from "@components/ui/Button";
import { Card } from "@components/ui/Card";
import { ControlSurfaceDefinition } from "@lib/types/control-surface";

const statusTone: Record<string, "success" | "warning" | "muted"> = {
  running: "success",
  ready: "success",
  paused: "warning"
};

export const automationPlaybookSurface: ControlSurfaceDefinition = {
  key: "automation-playbook",
  title: "Automation Playbooks",
  description: "Registry of active and planned automation templates with run-time metadata.",
  category: "Automation",
  icon: "🤖",
  priority: 15,
  component: async ({ client }) => {
    const blueprints = await client.fetchAutomationBlueprints();

    return (
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xl font-semibold text-white">Active automations</p>
            <p className="text-sm text-slate-400">Aligned with the registry-driven playbook catalog.</p>
          </div>
          <Button type="button">Create blueprint</Button>
        </div>

        <div className="mt-6 space-y-4">
          {blueprints.map((blueprint) => (
            <article key={blueprint.id} className="rounded-2xl border border-white/5 bg-slate-900/40 p-4">
              <header className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{blueprint.name}</p>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">{blueprint.type}</p>
                </div>
                <Badge tone={statusTone[blueprint.status] ?? "muted"}>{blueprint.status}</Badge>
              </header>
              <p className="mt-3 text-sm text-slate-300">Next run: {new Date(blueprint.nextRun).toLocaleString()}</p>
            </article>
          ))}
        </div>
      </Card>
    );
  }
};
