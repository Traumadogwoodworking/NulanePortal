"use client";

import { StatCard } from "@/components/ui/StatCard";
import { DAMAGE_SEVERITIES } from "@/lib/docudent/damageTaxonomy";
import { formatFacilitySeverityLabel, type FacilityDamageStats } from "@/lib/facilityDamageStats";

interface FacilityDamageStatsProps {
  stats: FacilityDamageStats | null;
  emptyLabel?: string;
}

function formatDate(value: string | null): string {
  if (!value) {
    return "No reports yet";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "No reports yet";
  }
  return date.toLocaleDateString();
}

export function FacilityDamageStatsPanel({ stats, emptyLabel = "No damage reports matched this facility." }: FacilityDamageStatsProps) {
  if (!stats) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_16px_40px_-24px_rgba(15,23,42,0.2)]">
        <p className="text-[12px] font-medium text-slate-600">{emptyLabel}</p>
      </div>
    );
  }

  const severityEntries = Object.entries(stats.severityCounts)
    .map(([severity, count]) => {
      const matching = DAMAGE_SEVERITIES.find((option) => option.value === severity);
      return {
        severity,
        label: matching?.label || severity,
        count,
      };
    })
    .sort((a, b) => Number(b.severity) - Number(a.severity));

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_18px_50px_-26px_rgba(15,23,42,0.22)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Damage activity</p>
          <p className="text-[12px] font-semibold text-slate-900">{stats.label}</p>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
          {stats.totalReports} report{stats.totalReports === 1 ? "" : "s"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Today" value={stats.reportsToday} detail="Reports" />
        <StatCard label="Last 7 Days" value={stats.reportsLast7Days} detail="Reports" />
        <StatCard label="Month to Date" value={stats.reportsMonthToDate} detail="Reports" />
        <StatCard label="Year to Date" value={stats.reportsYearToDate} detail="Reports" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Severity breakdown</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Top {formatFacilitySeverityLabel(stats.topSeverity)}
          </p>
        </div>
        <div className="mt-3 space-y-2">
          {severityEntries.length > 0 ? (
            severityEntries.map((entry) => (
              <div key={entry.severity} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2">
                <span className="text-[12px] font-semibold text-slate-700">{entry.label}</span>
                <span className="text-[12px] font-black text-slate-900">{entry.count}</span>
              </div>
            ))
          ) : (
            <p className="text-[12px] text-slate-500">No severity data available.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 text-[12px] text-slate-600">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className="font-semibold text-slate-500">Latest report</span>
          <span className="font-bold text-slate-900">{formatDate(stats.latestReportDate)}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className="font-semibold text-slate-500">Top area</span>
          <span className="font-bold text-slate-900">{stats.mostCommonDamageArea || "Unavailable"}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className="font-semibold text-slate-500">Top type</span>
          <span className="font-bold text-slate-900">{stats.mostCommonDamageType || "Unavailable"}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className="font-semibold text-slate-500">VINs</span>
          <span className="font-bold text-slate-900">{stats.uniqueVINs}</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2">
          <span className="font-semibold text-slate-500">Entries</span>
          <span className="font-bold text-slate-900">{stats.totalDamageEntries}</span>
        </div>
      </div>
    </div>
  );
}
