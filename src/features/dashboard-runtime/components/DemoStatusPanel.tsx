"use client";

import { useEffect, useMemo, useState } from "react";
import { getRuntimeDataSourceSummaries } from "../render-adapters";
import { getRuntimeBaseUrl, getRuntimeStatus, renderRuntimeDashboard } from "../runtime-client";

type Check = {
  label: string;
  status: "loading" | "ok" | "error";
  detail: string;
};

const dashboardSlug = "home-inspection-overview";
const nodeHealthUrl = process.env.NEXT_PUBLIC_NODE_API_HEALTH_URL || "http://localhost:3055/health";
const springHealthUrl = process.env.NEXT_PUBLIC_SPRING_RUNTIME_HEALTH_URL || "http://localhost:8090/health";

export function DemoStatusPanel() {
  const runtimeBaseUrl = getRuntimeBaseUrl();
  const dashboardUrl = "http://localhost:3000/analytics/home-inspection-overview";
  const demoStatusUrl = "http://localhost:3000/analytics/demo-status";
  const [checks, setChecks] = useState<Check[]>([
    { label: "Node API health", status: "loading", detail: nodeHealthUrl },
    { label: "Spring health", status: "loading", detail: springHealthUrl },
    { label: "Runtime status", status: "loading", detail: `${runtimeBaseUrl.replace(/\/api\/analytics$/, "")}/api/runtime/status` },
    { label: "Dashboard render", status: "loading", detail: `${runtimeBaseUrl}/dashboards/${dashboardSlug}/render` },
  ]);

  useEffect(() => {
    let cancelled = false;

    async function runChecks() {
      const [node, spring, runtime, render] = await Promise.all([
        fetchHealth("Node API health", nodeHealthUrl),
        fetchHealth("Spring health", springHealthUrl),
        getRuntimeStatus()
          .then((status) => ({
            label: "Runtime status",
            status: status.ok === false ? "error" : "ok",
            detail: runtimeStatusText(status),
          }) satisfies Check)
          .catch((error: unknown) => ({
            label: "Runtime status",
            status: "error",
            detail: error instanceof Error ? error.message : "Runtime status failed.",
          }) satisfies Check),
        renderRuntimeDashboard(dashboardSlug)
          .then((payload) => {
            const sources = getRuntimeDataSourceSummaries(payload);
            const sourceText = sources.map((source) => `${source.id}:${source.status}`).join(", ");
            const adapterPlan = sources.some((source) => source.adapterPlan);
            return {
              label: "Dashboard render",
              status: adapterPlan ? "error" : "ok",
              detail: adapterPlan ? `Rendered with adapter_plan: ${sourceText}` : `registered yes, render ok, ${sourceText}`,
            } satisfies Check;
          })
          .catch((error: unknown) => ({
            label: "Dashboard render",
            status: "error",
            detail: error instanceof Error ? error.message : "Render failed.",
          }) satisfies Check),
      ]);
      if (!cancelled) setChecks([node, spring, runtime, render]);
    }

    runChecks();
    return () => {
      cancelled = true;
    };
  }, [runtimeBaseUrl]);

  const renderStatus = useMemo(() => checks.find((check) => check.label === "Dashboard render"), [checks]);

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Analytics Runtime Demo Status</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">Local runtime proof</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          This page checks the local Node API, Spring runtime, and the registered home-inspection-overview dashboard render.
        </p>
      </section>

      <section className="grid gap-3 lg:grid-cols-4">
        {checks.map((check) => (
          <div key={check.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{check.label}</p>
            <p className={`mt-2 text-lg font-black ${check.status === "ok" ? "text-emerald-700" : check.status === "error" ? "text-rose-700" : "text-slate-600"}`}>
              {check.status}
            </p>
            <p className="mt-2 break-words text-xs font-semibold leading-5 text-slate-600">{check.detail}</p>
          </div>
        ))}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Exact URLs</p>
        <div className="mt-3 grid gap-2 text-sm font-bold text-slate-700">
          <a className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50" href={dashboardUrl}>
            {dashboardUrl}
          </a>
          <a className="rounded-md border border-slate-200 px-3 py-2 hover:bg-slate-50" href={demoStatusUrl}>
            {demoStatusUrl}
          </a>
          <span className="rounded-md border border-slate-200 px-3 py-2">{springHealthUrl}</span>
          <span className="rounded-md border border-slate-200 px-3 py-2">{nodeHealthUrl}</span>
          <span className="rounded-md border border-slate-200 px-3 py-2">{runtimeBaseUrl.replace(/\/api\/analytics$/, "")}/api/runtime/status</span>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Registration</p>
        <p className="mt-2 text-sm font-semibold text-slate-700">
          Dashboard registered: {renderStatus?.status === "ok" ? "yes" : renderStatus?.status === "loading" ? "checking" : "no"}
        </p>
        <p className="mt-1 text-xs font-semibold text-slate-500">Runtime base URL: {runtimeBaseUrl}</p>
      </section>
    </div>
  );
}

function runtimeStatusText(status: Record<string, unknown>): string {
  const adapterMode = String(status.adapterMode ?? "unknown");
  const audit = status.audit && typeof status.audit === "object" ? status.audit as Record<string, unknown> : {};
  const runner = status.runner && typeof status.runner === "object" ? status.runner as Record<string, unknown> : {};
  const nodeApi = status.nodeApi && typeof status.nodeApi === "object" ? status.nodeApi as Record<string, unknown> : {};
  const nodeHealth = nodeApi.health && typeof nodeApi.health === "object" ? nodeApi.health as Record<string, unknown> : {};
  return `adapter:${adapterMode}, node:${nodeHealth.ok === true ? "ok" : "check"}, audit:${audit.mode ?? "unknown"}, runner:${runner.mode ?? "unknown"}`;
}

async function fetchHealth(label: string, url: string): Promise<Check> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const text = await response.text();
    return {
      label,
      status: response.ok ? "ok" : "error",
      detail: `${response.status} ${text.slice(0, 160)}`,
    };
  } catch (error) {
    return {
      label,
      status: "error",
      detail: error instanceof Error ? error.message : "Health request failed.",
    };
  }
}
