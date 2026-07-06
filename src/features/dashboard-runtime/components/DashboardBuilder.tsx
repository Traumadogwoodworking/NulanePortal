"use client";

import { useMemo, useState } from "react";
import { REFERENCE_HOME_DASHBOARD } from "../definition-schema";
import { buildLocalReferenceRender, getDefinitionSummary } from "../render-adapters";
import { registerRuntimeDashboard } from "../runtime-client";
import type { RuntimeDashboardDefinition } from "../types";
import { DashboardLayoutGrid } from "./DashboardLayoutGrid";
import { DashboardUploadPanel } from "./DashboardUploadPanel";
import { RuntimeCoverageAlert } from "./RuntimeCoverageAlert";

export function DashboardBuilder() {
  const [definition, setDefinition] = useState<RuntimeDashboardDefinition>(REFERENCE_HOME_DASHBOARD);
  const [status, setStatus] = useState("Loaded the reference /home dashboard package.");
  const payload = useMemo(() => buildLocalReferenceRender(definition.slug), [definition.slug]);

  async function registerDefinition(nextDefinition: RuntimeDashboardDefinition) {
    setDefinition(nextDefinition);
    try {
      const result = await registerRuntimeDashboard(nextDefinition);
      setStatus(result.error ? result.error.message ?? "Runtime registration failed." : "Dashboard registered with runtime API.");
    } catch (error) {
      setStatus(error instanceof Error ? `Local preview only: ${error.message}` : "Local preview only.");
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="space-y-5">
        <DashboardUploadPanel onValidDefinition={registerDefinition} />
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Definition Summary</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {getDefinitionSummary(definition).map((item) => (
              <div key={item.label} className="rounded-md bg-slate-50 p-3">
                <p className="text-2xl font-black text-slate-950">{item.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-600">{status}</p>
        </div>
      </div>
      <div className="space-y-5">
        <RuntimeCoverageAlert warnings={definition.coverageRequirements} />
        <DashboardLayoutGrid payload={{ ...payload, definition, widgets: definition.widgets, layout: definition.layout }} />
      </div>
    </div>
  );
}
