"use client";

import { normalizeMediaUrl } from "@/lib/config";
import type { ReportDamageApiRow } from "@/lib/types";

export function DamageMapCard({ report }: { report?: ReportDamageApiRow | null }) {
  const splatUrl = report?.splat_urls?.[0] ? normalizeMediaUrl(report.splat_urls[0]) : null;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Damage map</p>
            <p className="text-lg font-black tracking-tight text-slate-950">Splat</p>
          </div>
          <span className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-500">Live</span>
        </div>
      </div>
      <div className="bg-white p-4">
        {splatUrl ? (
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={splatUrl} alt="Damage splat" className="h-[34rem] w-full object-contain bg-white sm:h-[42rem]" />
          </div>
        ) : (
          <div className="flex min-h-[24rem] items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
            <p className="text-sm font-semibold text-slate-700">Splat unavailable</p>
          </div>
        )}
      </div>
    </div>
  );
}
