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

  const handleRuntimeResult = useCallback((result: RuntimeRenderPayload & { error?: { message?: string } }) => {
    if (result.error) throw new Error(result.error.message || "Runtime render failed.");
    setPayload(result);
    setStatus("Runtime API render.");
  }, []);

  const loadDashboard = useCallback((filters: Record<string, string> = {}) => {
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
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Render Source</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{status}</p>
        </div>
        <RuntimeFreshnessBadge
          status={payload.freshness?.status}
          renderedAt={payload.freshness?.rendered_at ?? payload.freshness?.renderedAt}
        />
      </div>
      <RuntimeDemoPanel payload={payload} status={status} />
      <DashboardFilterBar onApply={loadDashboard} />
      <RuntimeCoverageAlert warnings={payload.coverageWarnings} />
      <DashboardLayoutGrid payload={payload} />
    </div>
  );
}
