"use client";

import { Card } from "@/components/ui/Card";
import type { MetricCardProps } from "../types";

export function MetricCard({ label, value, detail, icon, accent = false }: MetricCardProps) {
  return (
    <Card className={`p-4 ${accent ? "border-slate-300 shadow-[0_24px_60px_-26px_rgba(15,23,42,0.35)] ring-1 ring-slate-200" : ""}`}>
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        {icon ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500">{icon}</div> : null}
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</div>
          {detail ? <p className="mt-1 text-xs text-slate-600">{detail}</p> : null}
        </div>
      </div>
    </Card>
  );
}
