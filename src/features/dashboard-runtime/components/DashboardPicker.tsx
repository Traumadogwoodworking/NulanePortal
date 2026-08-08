"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Boxes } from "lucide-react";
import { REFERENCE_HOME_DASHBOARD } from "../definition-schema";
import { listRuntimeDashboards } from "../runtime-client";
import { getDefinitionSummary } from "../render-adapters";

export function DashboardPicker() {
  const [dashboards, setDashboards] = useState<Array<Record<string, unknown>>>([]);
  const [runtimeState, setRuntimeState] = useState("Checking runtime API...");

  useEffect(() => {
    let cancelled = false;
    listRuntimeDashboards()
      .then((result) => {
        if (cancelled) return;
        setDashboards((Array.isArray(result.dashboards) ? result.dashboards : []) as Array<Record<string, unknown>>);
        setRuntimeState("Runtime API connected.");
      })
      .catch(() => {
        if (cancelled) return;
        setDashboards([]);
        setRuntimeState("Runtime API not connected; showing local reference package.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cards = dashboards.length ? dashboards : [REFERENCE_HOME_DASHBOARD];

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm font-semibold text-slate-600 shadow-sm">{runtimeState}</div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((dashboard) => {
          const slug = String(dashboard.slug ?? dashboard.id ?? REFERENCE_HOME_DASHBOARD.slug);
          const title = String(dashboard.title ?? "Dashboard");
          return (
            <Link
              key={slug}
              href={`/analytics/${slug}`}
              className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <Boxes className="h-5 w-5 text-slate-500" />
                <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-700" />
              </div>
              <h2 className="mt-4 text-xl font-black tracking-tight text-slate-950">{title}</h2>
              <p className="mt-2 text-sm font-medium leading-6 text-slate-600">{String(dashboard.description ?? "Runtime dashboard definition")}</p>
              {slug === REFERENCE_HOME_DASHBOARD.slug ? (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {getDefinitionSummary(REFERENCE_HOME_DASHBOARD).map((item) => (
                    <div key={item.label} className="rounded-md bg-slate-50 p-2">
                      <p className="text-lg font-black text-slate-950">{item.value}</p>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
