"use client";

import { useCallback, useEffect, useState } from "react";
import { buildLocalReferenceRender } from "../render-adapters";
import { renderRuntimeDashboard } from "../runtime-client";
import type { RuntimeRenderPayload } from "../types";
import { DashboardFilterBar } from "./DashboardFilterBar";
import { DashboardLayoutGrid } from "./DashboardLayoutGrid";
import { RuntimeCoverageAlert } from "./RuntimeCoverageAlert";
import { RuntimeDemoPanel } from "./RuntimeDemoPanel";
import { RuntimeFreshnessBadge } from "./RuntimeFreshnessBadge";

export function DashboardViewer({ dashboardSlug }: { dashboardSlug: string }) {
  const [payload, setPayload] = useState<RuntimeRenderPayload>(() => buildLocalReferenceRender(dashboardSlug));
  const [status, setStatus] = useState("Loading runtime dashboard...");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const handleRuntimeResult = useCallback((result: RuntimeRenderPayload & { error?: { message?: string } }) => {
    if (result.error) throw new Error(result.error.message || "Runtime render failed.");
    setPayload(result);
    setStatus("Runtime API render.");
  }, []);

  const loadDashboard = useCallback((filters: Record<string, string> = {}) => {
    setActiveFilters(filters);
    setStatus("Loading runtime dashboard with filters...");
    renderRuntimeDashboard(dashboardSlug, filters)
      .then(handleRuntimeResult)
      .catch((error: unknown) => {
        setPayload(buildLocalReferenceRender(dashboardSlug));
        setStatus(error instanceof Error ? `Local reference fallback: ${error.message}` : "Local reference fallback.");
      });
  }, [dashboardSlug, handleRuntimeResult]);

  useEffect(() => {
    let cancelled = false;
    renderRuntimeDashboard(dashboardSlug)
      .then((result) => {
        if (cancelled) return;
        handleRuntimeResult(result);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPayload(buildLocalReferenceRender(dashboardSlug));
        setStatus(error instanceof Error ? `Local reference fallback: ${error.message}` : "Local reference fallback.");
      });
    return () => {
      cancelled = true;
    };
  }, [dashboardSlug, handleRuntimeResult]);

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-950 px-5 py-5 text-white">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200">Analytics Runtime</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight">{payload.dashboard.title}</h1>
              <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-300">
                Native React dashboard rendered from a dashboard package. Data is executed by Spring through the existing scoped Node endpoints.
              </p>
            </div>
            <RuntimeFreshnessBadge
              status={payload.freshness?.status}
              renderedAt={payload.freshness?.rendered_at ?? payload.freshness?.renderedAt}
            />
          </div>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-3">
          <StatusFact label="Render Source" value={status} tone="slate" />
          <StatusFact label="Package" value={payload.dashboard.slug || dashboardSlug} tone="slate" />
          <StatusFact label="Coverage" value={`${payload.coverageWarnings?.length ?? 0} warning${(payload.coverageWarnings?.length ?? 0) === 1 ? "" : "s"}`} tone={(payload.coverageWarnings?.length ?? 0) ? "amber" : "emerald"} />
        </div>
      </section>

      <DashboardFilterBar payload={payload} currentFilters={activeFilters} onApply={loadDashboard} />
      <RuntimeDemoPanel payload={payload} status={status} />
      <RuntimeCoverageAlert warnings={payload.coverageWarnings} />
      <DashboardLayoutGrid payload={payload} />
    </div>
  );
}

function StatusFact({ label, value, tone }: { label: string; value: string; tone: "slate" | "amber" | "emerald" }) {
  const toneClass =
    tone === "amber"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : tone === "emerald"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : "border-slate-200 bg-slate-50 text-slate-800";
  return (
    <div className={`min-w-0 rounded-md border px-3 py-2 ${toneClass}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1 truncate text-sm font-black" title={value}>
        {value}
      </p>
    </div>
  );
}
