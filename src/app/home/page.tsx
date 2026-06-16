"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Filter,
  FileText,
  LayoutGrid,
  ShieldAlert,
  TriangleAlert,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { DataTableShell } from "@/components/ui/DataTableShell";
import { ReportDateRangeFilter } from "@/components/reports/ReportDateRangeFilter";
import { Separator } from "@/components/ui/Separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePortalDirectorySnapshot, usePortalReportsSnapshot } from "@/lib/portalData";
import { usePortalSession } from "@/lib/portalSession";
import { buildFacilityDamageStats } from "@/lib/facilityDamageStats";
import { chartTheme } from "@/lib/chartTheme";
import { DAMAGE_SEVERITIES } from "@/lib/docudent/damageTaxonomy";
import { resolveDamageReportLocationName, slugForFacilityLabel, stripFacilitySuffix } from "@/lib/reportUtils";
import {
  normalizeLabel,
  normalizeSearchText,
  matchesDamageReportFilters,
  DEFAULT_DAMAGE_REPORT_FILTERS,
  DAMAGE_FILTER_OPTIONS,
} from "@/lib/reportFilters";
import type { FacilityDamageStats } from "@/lib/facilityDamageStats";
import type { ReportDamageApiRow, RsaReportApiRow } from "@/lib/types";
import { severityPillClass } from "@/lib/severityTheme";

type DashboardSeverityItem = {
  level: string;
  label: string;
  count: number;
  percent: number;
};

type DashboardFacilityItem = {
  id: string;
  name: string;
  damageReports: number;
  rsaReports: number;
  today: number;
  last7Days: number;
  monthToDate: number;
  yearToDate: number;
  vins: number;
  entries: number;
  highSeverityCount: number;
  highSeverityPercent: number;
  latestReportDate: string | null;
  topArea: string | null;
  topType: string | null;
  severity: DashboardSeverityItem[];
};

type InspectorSummary = {
  email: string;
  label: string;
  reportCount: number;
  severity: DashboardSeverityItem[];
};

type PieAreaDatum = {
  name: string;
  count: number;
  fill: string;
  breakdown?: PieBreakdownItem[];
};

type PieBreakdownItem = {
  label: string;
  count: number;
};

type ChartTooltipItem = {
  name?: string | number;
  value?: number | string;
  color?: string;
  fill?: string;
  dataKey?: string | number;
  payload?: {
    name?: string | number;
    breakdown?: PieBreakdownItem[];
  };
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ChartTooltipItem[];
};

type DashboardSummary = {
  totals: {
    damageReports: number;
    rsaReports: number;
    facilities: number;
    vins: number;
    entries: number;
  };
  currentPeriod: {
    damageToday: number;
    rsaToday: number;
    damageLast7Days: number;
    rsaLast7Days: number;
    damageMonthToDate: number;
    damageYearToDate: number;
  };
  severity: DashboardSeverityItem[];
  severityGroups: {
    low: number;
    medium: number;
    high: number;
  };
  dailyTrend: {
    date: string;
    damageReports: number;
    rsaReports: number;
  }[];
  facilities: DashboardFacilityItem[];
  topAreas: {
    name: string;
    count: number;
  }[];
  topTypes: {
    name: string;
    count: number;
  }[];
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "≤1\" (≤3 cm)",
  2: ">1\" to ≤3\" (3–8 cm)",
  3: ">3\" to ≤6\" (8–15 cm)",
  4: ">6\" to ≤12\" (15–30 cm)",
  5: ">12\" (≥30 cm)",
  6: "Missing / Major Damage",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function exportLabel(value: string | null | undefined): string {
  const normalized = (value ?? "").toString().trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }
  return normalized
    .split(" ")
    .map((word) => (word && /[a-z]/.test(word[0]) ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function downloadCsv(filename: string, rows: unknown[][]): void {
  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeDate(value?: string | null): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateKeyLabel(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return new Date(year, month - 1, day).toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatEvenDateKeyLabel(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day || day % 2 !== 0) {
    return "";
  }
  return formatDateKeyLabel(value);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.max(Math.round((endUtc - startUtc) / 86400000), 0);
}

function formatDate(value: string | null): string {
  const parsed = safeDate(value);
  return parsed ? parsed.toLocaleDateString() : "Unavailable";
}

function getReportDate(report: ReportDamageApiRow | RsaReportApiRow): Date | null {
  return safeDate(report.created_at || report.updated_at || null);
}

function getSeverityNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const rounded = Math.round(value);
    return rounded >= 1 && rounded <= 6 ? rounded : null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return null;
    if (/^[1-6]$/.test(normalized)) return Number(normalized);
    if (normalized === "low") return 1;
    if (normalized === "medium") return 3;
    if (normalized === "high") return 5;
  }
  return null;
}

function resolveDamageSeverity(entry: Record<string, unknown>): number | null {
  return getSeverityNumber(
    entry.severity ?? entry.severity_level ?? entry.severityLevel ?? entry.severity_code ?? entry.severityCode
  );
}

function getReportSeverity(report: ReportDamageApiRow): number | null {
  const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  let highest: number | null = null;
  for (const entry of entries) {
    const severity = resolveDamageSeverity(entry as unknown as Record<string, unknown>);
    if (severity && (highest === null || severity > highest)) {
      highest = severity;
    }
  }
  return highest;
}

function getDamageEntryField(entry: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const candidate = entry[key];
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }
  return "";
}

function buildSeverityItemsFromCounts(counts: Map<number, number>, total: number): DashboardSeverityItem[] {
  return [1, 2, 3, 4, 5, 6].map((level) => {
    const count = counts.get(level) ?? 0;
    return {
      level: String(level),
      label: SEVERITY_LABELS[level],
      count,
      percent: total > 0 ? (count / total) * 100 : 0,
    };
  });
}

function groupSeverityCounts(reports: ReportDamageApiRow[]) {
  const counts = new Map<number, number>();
  let low = 0;
  let medium = 0;
  let high = 0;
  let entries = 0;
  for (const report of reports) {
    const reportEntries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
    for (const entry of reportEntries) {
      const severity = resolveDamageSeverity(entry as unknown as Record<string, unknown>);
      if (!severity) continue;
      entries += 1;
      counts.set(severity, (counts.get(severity) ?? 0) + 1);
      if (severity <= 2) low += 1;
      else if (severity <= 4) medium += 1;
      else high += 1;
    }
  }
  return { counts, low, medium, high, entries };
}

function buildTrendData(
  damageReports: ReportDamageApiRow[],
  rsaReports: RsaReportApiRow[],
  days = 30
): { date: string; damageReports: number; rsaReports: number }[] {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (days - 1));
  const bucketMap = new Map<string, { date: string; damageReports: number; rsaReports: number }>();
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const key = toDateInputValue(date);
    bucketMap.set(key, { date: key, damageReports: 0, rsaReports: 0 });
  }
  for (const report of damageReports) {
    const date = getReportDate(report);
    if (!date) continue;
    const key = toDateInputValue(date);
    const bucket = bucketMap.get(key);
    if (bucket) bucket.damageReports += 1;
  }
  for (const report of rsaReports) {
    const date = getReportDate(report);
    if (!date) continue;
    const key = toDateInputValue(date);
    const bucket = bucketMap.get(key);
    if (bucket) bucket.rsaReports += 1;
  }
  return [...bucketMap.values()];
}

function buildTopBuckets(items: Map<string, number>): { name: string; count: number }[] {
  return [...items.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

const SEVERITY_PIE_COLORS: Record<string, string> = {
  "1": "#10b981",
  "2": "#fbbf24",
  "3": "#f97316",
  "4": "#ef4444",
  "5": "#881337",
  "6": "#64748b",
};

function buildPieData(items: { name: string; count: number }[]) {
  const palette = ["#1d4ed8", "#0f766e", "#7c3aed", "#dc2626", "#059669", "#ea580c", "#0ea5e9", "#4338ca"];
  return items.map((item, index) => ({
    ...item,
    fill: palette[index % palette.length],
  }));
}

function buildAllAreaPieData(items: { name: string; count: number }[]): PieAreaDatum[] {
  const palette = [
    "#2563eb",
    "#0f766e",
    "#7c3aed",
    "#dc2626",
    "#ea580c",
    "#16a34a",
    "#db2777",
    "#0ea5e9",
    "#9333ea",
    "#0891b2",
  ];
  return items
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      fill: palette[index % palette.length],
    }));
}

function buildSelectedAreaPieData(items: { name: string; count: number }[], selectedArea: string): PieAreaDatum[] {
  const selected = selectedArea.trim();
  return buildAllAreaPieData(items).map((item) => ({
    ...item,
    count: !selected || item.name === selected ? item.count : 0,
  }));
}

function getPieSliceLabel(name: string, percent: number, index: number): string {
  if (!percent || percent <= 0) {
    return "";
  }
  if (index < 5) {
    return `${name} ${(percent * 100).toFixed(0)}%`;
  }
  return "";
}

function buildSeverityPieData(items: DashboardSeverityItem[]) {
  return items.map((item) => ({
    name: `${item.level} - ${item.label}`,
    count: item.count,
    fill: SEVERITY_PIE_COLORS[item.level] ?? "#cbd5e1",
  }));
}

function buildSelectedSeverityPieData(items: DashboardSeverityItem[], selectedLevel: string): Array<{ name: string; count: number; fill: string }> {
  const normalizedSelected = selectedLevel === "all" ? "" : selectedLevel;
  return buildSeverityPieData(items).map((item) => ({
    ...item,
    count: !normalizedSelected || String(item.name).startsWith(`${normalizedSelected} `) ? item.count : 0,
  }));
}

function buildModelOptions(reports: ReportDamageApiRow[]): { value: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const report of reports) {
    const model = normalizeKnownModelLabel(report.model || "");
    if (!model) {
      continue;
    }
    counts.set(model, (counts.get(model) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ value: label, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function buildLocationCounts<T>(
  items: T[],
  getBucket: (item: T) => string | null,
  getLocation: (item: T) => string
): Map<string, Map<string, number>> {
  const bucketMap = new Map<string, Map<string, number>>();
  for (const item of items) {
    const bucket = getBucket(item);
    if (!bucket) continue;
    const location = getLocation(item);
    if (!location) continue;
    const locationMap = bucketMap.get(bucket) ?? new Map<string, number>();
    locationMap.set(location, (locationMap.get(location) ?? 0) + 1);
    bucketMap.set(bucket, locationMap);
  }
  return bucketMap;
}

function buildTopCounts(items: Map<string, number>, limit = 5): { name: string; count: number }[] {
  return [...items.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function buildTopLocations(locationCounts: Map<string, number> | undefined, limit = 3): { name: string; count: number }[] {
  if (!locationCounts) {
    return [];
  }
  return [...locationCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

function resolveSeverityLabel(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "Severity unavailable";
  }
  const normalized = `${value}`.trim();
  const option = DAMAGE_SEVERITIES.find((entry) => entry.value === normalized);
  return option?.label || normalized;
}

function normalizeKnownModelLabel(value?: string | null): string {
  const normalized = normalizeLabel(value || "");
  const lower = normalized.toLowerCase();
  if (!normalized || lower.includes("unknown") || lower.includes("unavailable")) {
    return "";
  }
  return normalized;
}

function normalizeOrganizationName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

type ChartSectionRow = {
  section: string;
  car: string;
  count: number;
  severity?: string;
};

type ChartSectionGroup = {
  section: string;
  rows: ChartSectionRow[];
};

function buildSeverityTotalRows(severityItems: DashboardSeverityItem[]): ChartSectionGroup[] {
  return severityItems.map((item) => ({
    section: item.label,
    rows: [
      {
        section: item.label,
        car: "Total",
        count: item.count,
        severity: item.level,
      },
    ],
  }));
}

function buildAreaTotalRows(areas: { name: string; count: number }[]): ChartSectionGroup[] {
  return areas.slice(0, 20).map((area) => ({
    section: area.name,
    rows: [
      {
        section: area.name,
        car: "Total",
        count: area.count,
      },
    ],
  }));
}

function buildTopCarRowsBySeverity(reports: ReportDamageApiRow[], severityItems: DashboardSeverityItem[]): ChartSectionGroup[] {
  const bucketMap = new Map<string, Map<string, number>>();
  for (const report of reports) {
    const severity = getReportSeverity(report);
    if (!severity) continue;
    const section = SEVERITY_LABELS[severity];
    const make = normalizeLabel(report.make || "");
    const model = normalizeKnownModelLabel(report.model || "");
    if (!make || !model || make.toLowerCase() === "unknown" || model.toLowerCase() === "unknown") {
      continue;
    }
    const car = `${make} ${model}`;
    const sectionMap = bucketMap.get(section) ?? new Map<string, number>();
    sectionMap.set(car, (sectionMap.get(car) ?? 0) + 1);
    bucketMap.set(section, sectionMap);
  }

  return severityItems
    .map((item) => {
      const section = item.label;
      const cars = bucketMap.get(section);
      if (!cars || cars.size === 0) {
        return null;
      }
      const rows = [...cars.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([car, count]) => ({
          section,
          car,
          count,
          severity: item.level,
        }));
      return { section, rows } as ChartSectionGroup;
    })
    .filter((row): row is ChartSectionGroup => Boolean(row));
}

function buildTopCarRowsByArea(reports: ReportDamageApiRow[], areas: { name: string; count: number }[]): ChartSectionGroup[] {
  const bucketMap = new Map<string, Map<string, number>>();
  const areaSet = new Set(areas.map((area) => area.name));

  for (const report of reports) {
    const make = normalizeLabel(report.make || "");
    const model = normalizeKnownModelLabel(report.model || "");
    if (!make || !model || make.toLowerCase() === "unknown" || model.toLowerCase() === "unknown") {
      continue;
    }
    const car = `${make} ${model}`;
    const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
    const uniqueAreas = new Set<string>();
    for (const entry of entries) {
      const record = entry as unknown as Record<string, unknown>;
      const area = normalizeLabel(
        getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"])
      );
      if (area !== "Unavailable" && areaSet.has(area)) {
        uniqueAreas.add(area);
      }
    }
    for (const area of uniqueAreas) {
      const areaMap = bucketMap.get(area) ?? new Map<string, number>();
      areaMap.set(car, (areaMap.get(car) ?? 0) + 1);
      bucketMap.set(area, areaMap);
    }
  }

  return areas
    .map((area) => {
      const cars = bucketMap.get(area.name);
      if (!cars || cars.size === 0) {
        return null;
      }
      const rows = [...cars.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([car, count]) => ({
          section: area.name,
          car,
          count,
        }));
      return { section: area.name, rows } as ChartSectionGroup;
    })
    .filter((row): row is ChartSectionGroup => Boolean(row));
}

function ChartFooterTable({
  title,
  subtitle,
  items,
  showSeverityPills = false,
  showRowCount = true,
}: {
  title: string;
  subtitle: string;
  items: ChartSectionGroup[];
  showSeverityPills?: boolean;
  showRowCount?: boolean;
}) {
  return (
    <div className="shrink-0 border-t border-slate-200 bg-slate-50/70">
      <div className="flex items-end justify-between gap-4 px-6 py-4">
        <div className="space-y-1">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
          <p className="text-xs text-slate-600">{subtitle}</p>
        </div>
        {showRowCount ? (
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{formatNumber(items.length)} rows</span>
        ) : null}
      </div>
      <div className="max-h-[260px] overflow-y-auto border-t border-slate-200">
        {items.length ? (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  {showSeverityPills ? "Severity" : "Section"}
                </th>
                <th className="px-6 py-3 text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Model</th>
                <th className="px-6 py-3 text-right text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {items.map((item) =>
                item.rows.map((row, rowIndex) => (
                  <tr key={`${item.section}-${row.car}`} className="align-top">
                    <td className="px-6 py-3 text-sm font-semibold text-slate-900">
                      {showSeverityPills && row.severity ? (
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${severityPillClass(row.severity)}`}
                        >
                          {resolveSeverityLabel(row.severity)}
                        </span>
                      ) : rowIndex === 0 ? (
                        <span className="block text-xs font-black uppercase tracking-[0.18em] text-slate-500">{item.section}</span>
                      ) : null}
                    </td>
                    <td className="px-6 py-3">
                      <p className="truncate text-sm font-semibold text-slate-900">{row.car}</p>
                    </td>
                    <td className="px-6 py-3 text-right text-sm font-black tracking-tight text-slate-950">{formatNumber(row.count)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <p className="px-6 py-4 text-sm text-slate-500">No make/model pairs available in the current filtered view.</p>
        )}
      </div>
    </div>
  );
}

function reportMatchesSeverityFilter(report: ReportDamageApiRow, severityFilter: number | null): boolean {
  if (severityFilter === null) {
    return true;
  }
  return getReportSeverity(report) === severityFilter;
}

function formatTooltipLabel(label: string | number | undefined): string {
  if (typeof label === "number") {
    return String(label);
  }
  if (!label) {
    return "Summary";
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(label) ? formatDateKeyLabel(label) : label;
}

function NonZeroBarTooltip({ active, label, payload, hideSeriesNames = false }: ChartTooltipProps & { hideSeriesNames?: boolean }) {
  if (!active || !payload?.length) {
    return null;
  }

  const visibleItems = payload.filter((item) => {
    const value = typeof item.value === "number" ? item.value : Number(item.value ?? 0);
    return value > 0;
  });

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-[color:var(--border-subtle)] bg-white p-3 shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
        {formatTooltipLabel(label)}
      </p>
      <div className="mt-2 space-y-2">
        {visibleItems.map((item) => {
          const value = typeof item.value === "number" ? item.value : Number(item.value ?? 0);
          return (
            <div key={`${String(item.name)}-${item.dataKey ?? item.color ?? value}`} className="flex items-center justify-between gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill || chartTheme.colors.text }} />
                <span className="text-slate-700">{hideSeriesNames ? "" : String(item.name)}</span>
              </div>
              <span className="font-bold text-slate-950">{formatNumber(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PieSummaryTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  const value = typeof item.value === "number" ? item.value : Number(item.value ?? 0);
  const datum = item.payload ?? {};
  const sliceName = typeof datum.name === "string" || typeof datum.name === "number" ? String(datum.name) : "Summary";
  const breakdown = Array.isArray(datum.breakdown) ? datum.breakdown : [];

  return (
    <div className="min-w-[220px] rounded-2xl border border-[color:var(--border-subtle)] bg-white p-3 shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{sliceName}</p>
      <div className="mt-2">
        <div className="text-3xl font-black tracking-tight text-slate-950">{formatNumber(value)}</div>
      </div>
      {breakdown.length ? (
        <>
          <Separator className="my-3" />
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Facility breakdown</p>
            {breakdown.map((entry) => (
              <div key={entry.label} className="flex items-center justify-between gap-4 text-xs font-semibold text-slate-700">
                <span className="truncate">{entry.label}</span>
                <span className="text-slate-950">{formatNumber(entry.count)}</span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function buildFacilityBreakdownFromReports(
  reports: ReportDamageApiRow[],
  predicate: (report: ReportDamageApiRow) => boolean,
  limit = 3
): PieBreakdownItem[] {
  const counts = new Map<string, number>();
  for (const report of reports) {
    if (!predicate(report)) {
      continue;
    }
    const facility = stripFacilitySuffix(getReportFacilityLabel(report));
    counts.set(facility, (counts.get(facility) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit);
}

function getReportDateBounds(reports: ReportDamageApiRow[]): { minDate: string | null; maxDate: string | null } {
  const dates = reports
    .map((report) => getReportDate(report))
    .filter((date): date is Date => Boolean(date))
    .sort((left, right) => left.getTime() - right.getTime());
  return {
    minDate: dates[0] ? toDateInputValue(dates[0]) : null,
    maxDate: dates[dates.length - 1] ? toDateInputValue(dates[dates.length - 1]) : null,
  };
}

function buildInspectorSummaries(reports: ReportDamageApiRow[]): InspectorSummary[] {
  const grouped = new Map<string, { email: string; label: string; reportCount: number; severityCounts: Map<number, number> }>();
  for (const report of reports) {
    const email = (report.inspector_email || "unassigned").trim().toLowerCase();
    const label = report.inspector_email?.trim() || "Unassigned";
    const current = grouped.get(email) ?? { email, label, reportCount: 0, severityCounts: new Map<number, number>() };
    current.reportCount += 1;
    const severity = getReportSeverity(report);
    if (severity !== null) {
      current.severityCounts.set(severity, (current.severityCounts.get(severity) ?? 0) + 1);
    }
    grouped.set(email, current);
  }
  return [...grouped.values()]
    .sort((a, b) => b.reportCount - a.reportCount || a.label.localeCompare(b.label))
    .map((item) => ({
      email: item.email,
      label: item.label,
      reportCount: item.reportCount,
      severity: buildSeverityItemsFromCounts(item.severityCounts, item.reportCount),
    }));
}

function buildFacilityTrendFromStats(
  reports: ReportDamageApiRow[],
  facilityStats: FacilityDamageStats[],
  days = 30,
  endDate?: string
): { data: { date: string; [facility: string]: string | number }[]; keys: string[] } {
  const now = endDate ? new Date(endDate) : new Date();
  const start = addDays(now, -(days - 1));
  const dateRows = new Map<string, { date: string; [facility: string]: string | number }>();
  const reportToFacility = new Map<string, string>();
  const facilityLabels = [...facilityStats.map((stats) => stats.label)].sort((left, right) => left.localeCompare(right));

  for (const facility of facilityStats) {
    for (const reportId of facility.reportIds) {
      reportToFacility.set(reportId, facility.label);
    }
  }

  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(start, offset);
    const key = toDateInputValue(date);
    const row: { date: string; [facility: string]: string | number } = { date: key };
    for (const facility of facilityLabels) {
      row[facility] = 0;
    }
    dateRows.set(key, row);
  }

  for (const report of reports) {
    const date = getReportDate(report);
    if (!date) continue;
    const bucket = dateRows.get(toDateInputValue(date));
    if (!bucket) continue;
    const label = reportToFacility.get(report.report_id);
    if (!label) continue;
    bucket[label] = Number(bucket[label] ?? 0) + 1;
  }

  return { data: [...dateRows.values()], keys: facilityLabels };
}

function buildInspectorTrendData(
  reports: ReportDamageApiRow[],
  days = 30,
  endDate?: string
): { data: { date: string; [submitter: string]: string | number }[]; keys: string[] } {
  const now = endDate ? new Date(endDate) : new Date();
  const start = addDays(now, -(days - 1));
  const submitters = [...new Set(reports.map((report) => normalizeLabel(report.inspector_email || "Unassigned")))].sort((a, b) =>
    a.localeCompare(b)
  );
  const dateRows = new Map<string, { date: string; [submitter: string]: string | number }>();

  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(start, offset);
    const key = toDateInputValue(date);
    const row: { date: string; [submitter: string]: string | number } = { date: key };
    for (const submitter of submitters) {
      row[submitter] = 0;
    }
    dateRows.set(key, row);
  }

  for (const report of reports) {
    const date = getReportDate(report);
    if (!date) continue;
    const bucket = dateRows.get(toDateInputValue(date));
    if (!bucket) continue;
    const submitter = normalizeLabel(report.inspector_email || "Unassigned");
    bucket[submitter] = Number(bucket[submitter] ?? 0) + 1;
  }

  return { data: [...dateRows.values()], keys: submitters };
}

function getReportFacilityLabel(report: ReportDamageApiRow): string {
  return normalizeLabel(resolveDamageReportLocationName(report));
}

function getOverviewField(report: ReportDamageApiRow, key: keyof NonNullable<ReportDamageApiRow["overview"]>): string {
  const value = report.overview?.[key];
  return typeof value === "string" ? value : "";
}

function formatDamageEntries(entries: ReportDamageApiRow["damage_entries"]): string {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "";
  }
  return entries
    .map((entry, index) => {
      const record = entry as unknown as Record<string, unknown>;
      const area = normalizeLabel(getDamageEntryField(record, ["damage_area", "damage_area_name", "area"]));
      const type = normalizeLabel(getDamageEntryField(record, ["damage_type", "damage_type_name", "type"]));
      const severity = record.severity ?? record.severity_level ?? record.severityLevel;
      const comments = getDamageEntryField(record, ["comments", "comment", "notes"]);
      return [
        `Damage ${index + 1}`,
        area !== "Unavailable" ? area : "",
        type !== "Unavailable" ? type : "",
        severity !== undefined && severity !== null ? `Severity ${severity}` : "",
        comments,
      ]
        .filter(Boolean)
        .join(" | ");
    })
    .filter(Boolean)
    .join(" ; ");
}

function buildFilteredReportCsvRows(reports: ReportDamageApiRow[], primaryColumn: "facility" | "inspector"): unknown[][] {
  const primaryHeader = primaryColumn === "facility" ? exportLabel("Facility") : exportLabel("Inspector");
  const secondaryHeader = primaryColumn === "facility" ? exportLabel("Inspector") : exportLabel("Facility");
  return [
    [
      primaryHeader,
      secondaryHeader,
      exportLabel("VIN"),
      exportLabel("Make"),
      exportLabel("Model"),
      exportLabel("Year"),
      exportLabel("Status"),
      exportLabel("Inspector Email"),
      exportLabel("Comments"),
      exportLabel("Created At"),
      exportLabel("Updated At"),
      exportLabel("Overview Comments"),
      exportLabel("Bay Location"),
      exportLabel("Navigation"),
      exportLabel("Damage Entries"),
    ],
    ...reports.map((report) => {
      const facility = exportLabel(getReportFacilityLabel(report));
      const inspector = report.inspector_email || "Unassigned";
      const status = exportLabel(report.status || "");
      return [
        primaryColumn === "facility" ? facility : inspector,
        primaryColumn === "facility" ? inspector : facility,
        report.vin || "",
        report.make || "",
        report.model || "",
        report.year ?? "",
        status || report.status || "",
        report.inspector_email || "",
        report.comments || "",
        report.created_at || "",
        report.updated_at || "",
        getOverviewField(report, "comments"),
        exportLabel(getOverviewField(report, "bay_location")) || getOverviewField(report, "bay_location"),
        exportLabel(getOverviewField(report, "navigation") || getOverviewField(report, "navigation_text") || getOverviewField(report, "navigationText")) ||
          getOverviewField(report, "navigation") ||
          getOverviewField(report, "navigation_text") ||
          getOverviewField(report, "navigationText"),
        formatDamageEntries(report.damage_entries),
      ];
    }),
  ];
}

function buildDashboardSummary(
  damageReports: ReportDamageApiRow[],
  rsaReports: RsaReportApiRow[],
  facilities: FacilityDamageStats[]
): DashboardSummary {
  const todayKey = toDateInputValue(new Date());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const severityTotals = groupSeverityCounts(damageReports);
  const entriesByReport = damageReports.reduce((acc, report) => acc + (Array.isArray(report.damage_entries) ? report.damage_entries.length : 0), 0);
  const totalVins = new Set(damageReports.map((report) => (report.vin ?? "").trim().toUpperCase()).filter(Boolean)).size;

  const areaCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  for (const report of damageReports) {
    const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
    for (const entry of entries) {
      const record = entry as unknown as Record<string, unknown>;
      const area = normalizeLabel(
        getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"])
      );
      const type = normalizeLabel(
        getDamageEntryField(record, ["damage_type", "damage_type_code", "damage_type_name", "type", "type_code"])
      );
      if (area !== "Unavailable") areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
      if (type !== "Unavailable") typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
    }
  }

  const dailyTrend = buildTrendData(damageReports, rsaReports, 30);
  const severityItems = buildSeverityItemsFromCounts(severityTotals.counts, severityTotals.entries);

  const facilitySummaries = facilities.map((facility) => {
    const areaCountsForFacility = new Map<string, number>();
    const typeCountsForFacility = new Map<string, number>();
    const relatedReports = damageReports.filter((report) => normalizeLabel(report.location?.location_label || report.location?.location_name || report.location?.facility).toLowerCase() === facility.label.toLowerCase());
    let facilityEntries = 0;
    let highSeverityCount = 0;
    for (const report of relatedReports) {
      const reportEntries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
      facilityEntries += reportEntries.length;
      const severity = getReportSeverity(report);
      if (severity !== null && severity >= 5) {
        highSeverityCount += 1;
      }
      for (const entry of reportEntries) {
        const record = entry as unknown as Record<string, unknown>;
        const area = normalizeLabel(
          getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"])
        );
        const type = normalizeLabel(
          getDamageEntryField(record, ["damage_type", "damage_type_code", "damage_type_name", "type", "type_code"])
        );
        if (area !== "Unavailable") areaCountsForFacility.set(area, (areaCountsForFacility.get(area) ?? 0) + 1);
        if (type !== "Unavailable") typeCountsForFacility.set(type, (typeCountsForFacility.get(type) ?? 0) + 1);
      }
    }

    const relatedRsaReports = rsaReports.filter((report) => {
      const label = normalizeLabel(report.facility || report.track || report.spot).toLowerCase();
      return label === facility.label.toLowerCase();
    });

    const severityMap = new Map<number, number>();
    for (const report of relatedReports) {
      const severity = getReportSeverity(report);
      if (severity) severityMap.set(severity, (severityMap.get(severity) ?? 0) + 1);
    }
    const severity = buildSeverityItemsFromCounts(severityMap, relatedReports.length);
    const latestReport = relatedReports
      .map((report) => getReportDate(report))
      .filter((value): value is Date => Boolean(value))
      .sort((a, b) => b.getTime() - a.getTime())[0];
    const damageToday = relatedReports.filter((report) => {
      const date = getReportDate(report);
      return date ? toDateInputValue(date) === todayKey : false;
    }).length;
    const damageLast7Days = relatedReports.filter((report) => {
      const date = getReportDate(report);
      return date ? date >= weekAgo : false;
    }).length;
    const damageMonthToDate = relatedReports.filter((report) => {
      const date = getReportDate(report);
      return date ? date >= monthStart : false;
    }).length;
    const damageYearToDate = relatedReports.filter((report) => {
      const date = getReportDate(report);
      return date ? date >= yearStart : false;
    }).length;

    return {
      id: facility.key,
      name: facility.label,
      damageReports: relatedReports.length,
      rsaReports: relatedRsaReports.length,
      today: damageToday,
      last7Days: damageLast7Days,
      monthToDate: damageMonthToDate,
      yearToDate: damageYearToDate,
      vins: new Set(relatedReports.map((report) => (report.vin ?? "").trim().toUpperCase()).filter(Boolean)).size,
      entries: facilityEntries,
      highSeverityCount,
      highSeverityPercent: relatedReports.length > 0 ? (highSeverityCount / relatedReports.length) * 100 : 0,
      latestReportDate: latestReport ? latestReport.toISOString() : null,
      topArea: [...areaCountsForFacility.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      topType: [...typeCountsForFacility.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
      severity,
    };
  });

  return {
    totals: {
      damageReports: damageReports.length,
      rsaReports: rsaReports.length,
      facilities: facilities.length,
      vins: totalVins,
      entries: entriesByReport,
    },
    currentPeriod: {
      damageToday: damageReports.filter((report) => {
        const date = getReportDate(report);
        return date ? toDateInputValue(date) === todayKey : false;
      }).length,
      rsaToday: rsaReports.filter((report) => {
        const date = getReportDate(report);
        return date ? toDateInputValue(date) === todayKey : false;
      }).length,
      damageLast7Days: damageReports.filter((report) => {
        const date = getReportDate(report);
        return date ? date >= weekAgo : false;
      }).length,
      rsaLast7Days: rsaReports.filter((report) => {
        const date = getReportDate(report);
        return date ? date >= weekAgo : false;
      }).length,
      damageMonthToDate: damageReports.filter((report) => {
        const date = getReportDate(report);
        return date ? date >= monthStart : false;
      }).length,
      damageYearToDate: damageReports.filter((report) => {
        const date = getReportDate(report);
        return date ? date >= yearStart : false;
      }).length,
    },
    severity: severityItems,
    severityGroups: {
      low: severityTotals.low,
      medium: severityTotals.medium,
      high: severityTotals.high,
    },
    dailyTrend,
    facilities: facilitySummaries.sort((a, b) => b.damageReports - a.damageReports || a.name.localeCompare(b.name)),
    topAreas: buildTopBuckets(areaCounts),
    topTypes: buildTopBuckets(typeCounts),
  };
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent = false,
}: {
  label: string;
  value: number | string;
  detail?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Card className={`p-4 ${accent ? "border-slate-300 shadow-[0_24px_60px_-26px_rgba(15,23,42,0.35)] ring-1 ring-slate-200" : ""}`}>
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        {icon ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500">{icon}</div> : null}
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
          {detail ? <p className="mt-1 text-xs text-slate-600">{detail}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function HorizontalBarList({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle?: string;
  items: { label: string; value: number; detail?: string }[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} subtitle={subtitle} />
      <CardContent className="space-y-3">
        {items.length ? items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-slate-800">{item.label}</span>
              <span className="text-xs font-semibold text-slate-500">
                {formatNumber(item.value)}{item.detail ? ` · ${item.detail}` : ""}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-600"
                style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 6 : 0)}%` }}
              />
            </div>
          </div>
        )) : <p className="text-sm text-slate-500">No data available.</p>}
      </CardContent>
    </Card>
  );
}

function FacilitySummaryCard({ facility }: { facility: DashboardFacilityItem }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title={facility.name}
        subtitle={`Latest report ${formatDate(facility.latestReportDate)} · ${facility.highSeverityPercent.toFixed(1)}% high severity`}
        actions={<span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{formatNumber(facility.damageReports)} damage</span>}
      />
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Today</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(facility.today)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Last 7 Days</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(facility.last7Days)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Month to Date</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(facility.monthToDate)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Year to Date</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(facility.yearToDate)}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">Severity</p>
            <div className="mt-3 space-y-2">
              {facility.severity.map((item) => (
                <div key={`${facility.id}-${item.level}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-700">{item.level}</span>
                    <span className="text-[11px] font-semibold text-slate-500">{formatNumber(item.count)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-500"
                      style={{ width: `${Math.max(item.percent, item.count > 0 ? 6 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Top area</span>
              <span className="font-semibold text-slate-900">{facility.topArea || "Unavailable"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Top type</span>
              <span className="font-semibold text-slate-900">{facility.topType || "Unavailable"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">VINs</span>
              <span className="font-semibold text-slate-900">{formatNumber(facility.vins)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">Entries</span>
              <span className="font-semibold text-slate-900">{formatNumber(facility.entries)}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-500">High severity</span>
              <span className="font-semibold text-slate-900">
                {formatNumber(facility.highSeverityCount)} · {facility.highSeverityPercent.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { organizationId, session } = usePortalSession();
  const { data: directory, isLoading, error } = usePortalDirectorySnapshot();
  const { data: reportsSnapshot } = usePortalReportsSnapshot();
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(organizationId ?? "");
  const [selectedFacilityKey, setSelectedFacilityKey] = useState("all");
  const [selectedSeverityLevel, setSelectedSeverityLevel] = useState("all");
  const [selectedDamageAreaFilter, setSelectedDamageAreaFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [reportIdFilter, setReportIdFilter] = useState("");
  const [vinFilter, setVinFilter] = useState("");
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [inspectorEmailFilter, setInspectorEmailFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [homeFilterMenuOpen, setHomeFilterMenuOpen] = useState(false);
  const [activeHomeFilterKeys, setActiveHomeFilterKeys] = useState<Array<"report_id" | "vin" | "make" | "model" | "inspector_email" | "status">>([]);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState<Error | null>(null);

  const facilities = useMemo(() => directory?.facilities ?? [], [directory]);
  const facilitySource = facilities.length > 0 ? facilities : undefined;
  const damageReports = reportsSnapshot?.damageReports ?? [];
  const rsaReports = reportsSnapshot?.rsaReports ?? [];
  const homeFilters = useMemo(
    () => ({
      ...DEFAULT_DAMAGE_REPORT_FILTERS,
      facilityFilter: selectedFacilityKey,
      reportIdFilter,
      vinFilter,
      makeFilter,
      modelFilter,
      inspectorEmailFilter,
      statusFilter: statusFilter as "" | import("@/lib/types").ReportStatus,
      createdFrom,
      createdTo,
    }),
    [createdFrom, createdTo, inspectorEmailFilter, makeFilter, modelFilter, reportIdFilter, selectedFacilityKey, statusFilter, vinFilter]
  );
  const facilityDamageStats = useMemo(
    () => buildFacilityDamageStats(damageReports, facilitySource).sort((a, b) => b.totalReports - a.totalReports),
    [damageReports, facilitySource]
  );
  const currentOrganizationLabel =
    session?.organization?.name ||
    session?.organization?.organization_id ||
    organizationId ||
    "Current organization";
  const normalizedOrganizationName = normalizeOrganizationName(currentOrganizationLabel);
  const isInspectionTracOrg =
    normalizedOrganizationName === "american wheel & car" ||
    normalizedOrganizationName === "awct.inc" ||
    normalizedOrganizationName === "awc.inc" ||
    normalizedOrganizationName === "inspection trac" ||
    normalizedOrganizationName === "inspection track" ||
    normalizedOrganizationName === "signature vehicle logistics";
  const hideFacilitySelector = currentOrganizationLabel.trim().toLowerCase() === "free tier organization";
  const hideInspectorSections = hideFacilitySelector;
  const sanitizeFacilityDisplay = (value: string): string => stripFacilitySuffix(value);
  const sanitizeDisplay = (value: string): string => stripFacilitySuffix(value);
  const availableHomeFilterOptions = DAMAGE_FILTER_OPTIONS.filter((option) => !["facility", "severity", "date_range"].includes(option.key));
  const clearHomeFilters = () => {
    setHomeFilterMenuOpen(false);
    setActiveHomeFilterKeys([]);
      setSelectedFacilityKey("all");
      setSelectedSeverityLevel("all");
      setSelectedDamageAreaFilter("");
      setCreatedFrom("");
    setCreatedTo("");
    setReportIdFilter("");
    setVinFilter("");
    setMakeFilter("");
    setModelFilter("");
    setInspectorEmailFilter("");
    setStatusFilter("");
  };
  const renderHomeFilterControl = (key: (typeof activeHomeFilterKeys)[number]) => {
    if (key === "report_id") {
      return <input type="search" placeholder="Report ID" value={reportIdFilter} onChange={(e) => setReportIdFilter(e.target.value)} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />;
    }
    if (key === "vin") {
      return <input type="search" placeholder="VIN" value={vinFilter} onChange={(e) => setVinFilter(e.target.value.toUpperCase())} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />;
    }
    if (key === "make") {
      return <input type="search" placeholder="Make" value={makeFilter} onChange={(e) => setMakeFilter(e.target.value)} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />;
    }
    if (key === "model") {
      return <input type="search" placeholder="Model" value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />;
    }
    if (key === "inspector_email") {
      return (
        <select
          value={inspectorEmailFilter}
          onChange={(e) => setInspectorEmailFilter(e.target.value)}
          className="h-8 w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          <option value="">All inspectors</option>
          {inspectorChoices.map((inspector) => (
            <option key={inspector.email} value={inspector.email}>
              {inspector.label}
            </option>
          ))}
        </select>
      );
    }
    if (key === "status") {
      return (
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300">
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="review">Review</option>
          <option value="closed">Closed</option>
          <option value="verified">Verified</option>
          <option value="archived">Archived</option>
        </select>
      );
    }
    return null;
  };

  useEffect(() => {
    setSelectedOrganizationId(organizationId ?? "");
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) {
      setReportsLoading(false);
      setReportsError(null);
      return;
    }
    if (!reportsSnapshot) {
      setReportsLoading(true);
      setReportsError(null);
      return;
    }
    setReportsLoading(false);
    setReportsError(reportsSnapshot.partialError ? new Error(reportsSnapshot.partialError) : null);
  }, [organizationId, reportsSnapshot]);

  useEffect(() => {
    setSelectedFacilityKey("all");
    setSelectedSeverityLevel("all");
    setSelectedDamageAreaFilter("");
    setCreatedFrom("");
    setCreatedTo("");
    setReportIdFilter("");
    setVinFilter("");
    setMakeFilter("");
    setModelFilter("");
    setInspectorEmailFilter("");
    setStatusFilter("");
  }, [selectedOrganizationId]);

  const inspectorFilteredDamageReports = useMemo(
    () =>
      damageReports.filter((report) => {
        if (!inspectorEmailFilter) {
          return true;
        }
        const reportInspector = normalizeSearchText(report.inspector_email || (report as unknown as { inspectorEmail?: string }).inspectorEmail || "");
        return reportInspector === normalizeSearchText(inspectorEmailFilter);
      }),
    [damageReports, inspectorEmailFilter]
  );
  const severityFilteredDamageReports = useMemo(
    () => {
      const selectedSeverityFilter = selectedSeverityLevel === "all" ? null : Number(selectedSeverityLevel);
      return inspectorFilteredDamageReports.filter((report) => {
        if (!matchesDamageReportFilters(report, { ...homeFilters, inspectorEmailFilter: "" })) {
          return false;
        }
        if (selectedDamageAreaFilter) {
          const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
          const matchesArea = entries.some((entry) => {
            const record = entry as unknown as Record<string, unknown>;
            const area = normalizeLabel(
              getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"])
            );
            return area === selectedDamageAreaFilter;
          });
          if (!matchesArea) {
            return false;
          }
        }
        return reportMatchesSeverityFilter(report, selectedSeverityFilter);
      });
    },
    [homeFilters, inspectorFilteredDamageReports, selectedDamageAreaFilter, selectedSeverityLevel]
  );
  const inspectorChoices = useMemo(() => buildInspectorSummaries(severityFilteredDamageReports), [severityFilteredDamageReports]);

  const modelOptions = useMemo(() => buildModelOptions(severityFilteredDamageReports), [severityFilteredDamageReports]);
  const [selectedModelFilter, setSelectedModelFilter] = useState("all");
  useEffect(() => {
    if (selectedModelFilter === "all") {
      return;
    }
    if (!modelOptions.some((option) => option.value === selectedModelFilter)) {
      setSelectedModelFilter("all");
    }
  }, [modelOptions, selectedModelFilter]);
  const chartFilteredDamageReports = useMemo(
    () =>
      selectedModelFilter === "all"
        ? severityFilteredDamageReports
        : severityFilteredDamageReports.filter((report) => normalizeKnownModelLabel(report.model || "") === selectedModelFilter),
    [selectedModelFilter, severityFilteredDamageReports]
  );

  const filteredRsaReports = useMemo(() => {
    return rsaReports;
  }, [rsaReports]);

  const filteredFacilityStats = useMemo(
    () => buildFacilityDamageStats(severityFilteredDamageReports, facilitySource).sort((a, b) => b.totalReports - a.totalReports),
    [facilitySource, severityFilteredDamageReports]
  );
  const reportDateBounds = useMemo(() => getReportDateBounds(damageReports), [damageReports]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    console.debug("[home.data]", {
      selectedOrgId: selectedOrganizationId,
      activeFilterCount: activeHomeFilterKeys.length,
      reportPullCount: damageReports.length,
      normalizedDamageReportCount: damageReports.length,
      filteredDamageReportCount: severityFilteredDamageReports.length,
      facilityOptionCount: facilityDamageStats.length,
      reportsLoading,
      reportsError: reportsError ? reportsError.message : null,
    });
  }, [
    damageReports.length,
    facilityDamageStats.length,
    severityFilteredDamageReports.length,
    damageReports,
    reportsError,
    reportsLoading,
    activeHomeFilterKeys.length,
    selectedOrganizationId,
  ]);

  const summary = useMemo(
    () => buildDashboardSummary(severityFilteredDamageReports, filteredRsaReports, filteredFacilityStats),
    [filteredFacilityStats, filteredRsaReports, severityFilteredDamageReports]
  );
  const chartSummary = useMemo(
    () => buildDashboardSummary(chartFilteredDamageReports, filteredRsaReports, filteredFacilityStats),
    [chartFilteredDamageReports, filteredFacilityStats, filteredRsaReports]
  );
  const severityPieData = useMemo(
    () =>
      buildSelectedSeverityPieData(chartSummary.severity, selectedSeverityLevel).map((item) => {
        const severityLevel = String(item.name).split(" - ")[0];
        return {
          ...item,
          breakdown: buildFacilityBreakdownFromReports(
            chartFilteredDamageReports,
            (report) => {
              const reportSeverity = getReportSeverity(report);
              return reportSeverity !== null && String(reportSeverity) === severityLevel;
            }
          ),
        };
      }),
    [chartFilteredDamageReports, chartSummary.severity, selectedSeverityLevel]
  );
  const severityFooterRows = useMemo(
    () => (selectedModelFilter === "all" ? buildSeverityTotalRows(chartSummary.severity) : buildTopCarRowsBySeverity(chartFilteredDamageReports, chartSummary.severity)),
    [chartFilteredDamageReports, chartSummary.severity, selectedModelFilter]
  );
  const areaCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const report of chartFilteredDamageReports) {
      const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
      for (const entry of entries) {
        const record = entry as unknown as Record<string, unknown>;
        const area = normalizeLabel(
          getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"])
        );
        if (area !== "Unavailable") {
          counts.set(area, (counts.get(area) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [chartFilteredDamageReports]);
  const areaPieData = useMemo(
    () =>
      buildSelectedAreaPieData([...areaCounts.entries()].map(([name, count]) => ({ name, count })), selectedDamageAreaFilter).map((item) => ({
        ...item,
        breakdown: buildFacilityBreakdownFromReports(chartFilteredDamageReports, (report) => {
          const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
          return entries.some((entry) => {
            const record = entry as unknown as Record<string, unknown>;
            const area = normalizeLabel(
              getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"])
            );
            return area === item.name;
          });
        }),
      })),
    [areaCounts, chartFilteredDamageReports, selectedDamageAreaFilter]
  );
  const allAreaRows = useMemo(
    () => [...areaCounts.entries()].map(([name, count]) => ({ name, count })),
    [areaCounts]
  );
  const areaFooterRows = useMemo(
    () => (selectedModelFilter === "all" ? buildAreaTotalRows(allAreaRows) : buildTopCarRowsByArea(chartFilteredDamageReports, allAreaRows)),
    [allAreaRows, chartFilteredDamageReports, selectedModelFilter]
  );
  const areaCarRows = useMemo(
    () => buildTopCarRowsByArea(chartFilteredDamageReports, areaPieData),
    [areaPieData, chartFilteredDamageReports]
  );

  const visibleFacilityStats = useMemo(() => filteredFacilityStats, [filteredFacilityStats]);
  if (!organizationId) {
    return <EmptyState title="Home unavailable" description="Organization session required." />;
  }

  if (isLoading || reportsLoading) {
    return <div className="py-12 text-center text-sm text-slate-500">Loading home data...</div>;
  }

  if (error) {
    return <EmptyState title="Home data unavailable" description="Directory snapshot could not be loaded." tone="danger" />;
  }

  if (reportsError) {
    return <EmptyState title="Home data unavailable" description="Report data could not be loaded." tone="danger" />;
  }
  const trendEndDate = createdTo || undefined;
  const facilityTrend = buildFacilityTrendFromStats(severityFilteredDamageReports, filteredFacilityStats, 30, trendEndDate);
  const inspectorTrend = buildInspectorTrendData(severityFilteredDamageReports, 30, trendEndDate);
  const palette = ["#2563eb", "#dc2626", "#0f766e", "#7c3aed", "#ea580c", "#16a34a", "#db2777", "#0ea5e9"];
  const facilityTrendColors = new Map(facilityTrend.keys.map((facility, index) => [facility, palette[index % palette.length]] as const));
  const selectFacilityFromChart = (facilityLabel: string) => {
    const normalizedFacilityLabel = sanitizeFacilityDisplay(facilityLabel);
    const matched =
      filteredFacilityStats.find((stats) => sanitizeFacilityDisplay(stats.label) === normalizedFacilityLabel) ??
      facilityDamageStats.find((stats) => sanitizeFacilityDisplay(stats.label) === normalizedFacilityLabel);
    if (matched) {
      setSelectedFacilityKey(slugForFacilityLabel(matched.label));
    }
  };
  const selectInspectorFromChart = (inspectorLabel: string) => {
    const matched = inspectorChoices.find((inspector) => inspector.label === inspectorLabel || inspector.email === inspectorLabel);
    if (matched) {
      toggleInspectorFilter(matched.email);
    }
  };
  const toggleInspectorFilter = (email: string) => {
    setInspectorEmailFilter((current) => (current.trim().toLowerCase() === email.trim().toLowerCase() ? "" : email));
  };
  const selectSeverityFromChart = (severityLabel: string) => {
    const matched = buildSeverityPieData(chartSummary.severity).find((item) => item.name === severityLabel);
    if (matched) {
      setSelectedSeverityLevel((current) => (current === matched.name.split(" - ")[0] ? "all" : matched.name.split(" - ")[0]));
    }
  };
  const selectAreaFromPie = (areaName: string) => {
    setSelectedDamageAreaFilter((current) => (current === areaName ? "" : areaName));
  };

  return (
    <div className="space-y-6">
          <Card className="sticky top-0 z-30 overflow-visible border-slate-200/80 bg-white/95 shadow-[0_18px_60px_-34px_rgba(15,23,42,0.25)] backdrop-blur">
            <CardHeader
              title="Filters"
              subtitle="Narrow the home dashboard view."
              actions={
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearHomeFilters}
                    className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-slate-50 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm transition hover:bg-slate-100"
                  >
                    Clear filters
                  </button>
                  <DropdownMenu open={homeFilterMenuOpen} onOpenChange={setHomeFilterMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-800 shadow-sm transition hover:bg-blue-100"
                      >
                        <Filter className="h-4 w-4" />
                        + Add filter
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      <DropdownMenuLabel>Available filters</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {availableHomeFilterOptions.map((option) => (
                        <DropdownMenuItem
                          key={option.key}
                          onSelect={() => {
                            setActiveHomeFilterKeys((current) =>
                              current.includes(option.key as any) ? current : [...current, option.key as any]
                            );
                            setHomeFilterMenuOpen(false);
                          }}
                        >
                          {option.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              }
            />
            <CardContent>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Organization</span>
                  <select
                    value={selectedOrganizationId}
                    onChange={(event) => setSelectedOrganizationId(event.target.value)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                  >
                    <option value={organizationId ?? ""}>{sanitizeDisplay(currentOrganizationLabel)}</option>
                  </select>
                </label>
                {!hideFacilitySelector ? (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Facility</span>
                    <select
                      value={selectedFacilityKey}
                      onChange={(event) => setSelectedFacilityKey(event.target.value)}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="all">All facilities</option>
                      {facilityDamageStats.map((stats) => (
                        <option key={stats.key} value={slugForFacilityLabel(stats.label)}>
                          {sanitizeFacilityDisplay(stats.label)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Severity</span>
                  <select
                    value={selectedSeverityLevel}
                    onChange={(event) => setSelectedSeverityLevel(event.target.value)}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                  >
                    <option value="all">All severities</option>
                    {DAMAGE_SEVERITIES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Date Range</span>
                  <ReportDateRangeFilter
                    value={{ createdFrom, createdTo }}
                    onChange={({ createdFrom: nextFrom, createdTo: nextTo }) => {
                      setCreatedFrom(nextFrom);
                      setCreatedTo(nextTo);
                    }}
                    label="Select date"
                    minDate={reportDateBounds.minDate}
                    maxDate={reportDateBounds.maxDate}
                  />
                </div>
              </div>
              {activeHomeFilterKeys.length ? (
                <>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {activeHomeFilterKeys.map((key) => {
                      const label = availableHomeFilterOptions.find((option) => option.key === key)?.label ?? key;
                      return (
                        <div key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                          <span className="w-24 shrink-0 truncate text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                          {renderHomeFilterControl(key)}
                          <button
                            type="button"
                            onClick={() => setActiveHomeFilterKeys((current) => current.filter((item) => item !== key))}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
                            aria-label={`Remove ${label} filter`}
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <div className={`grid gap-4 xl:items-stretch ${hideFacilitySelector ? "xl:grid-cols-1" : "xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.7fr)]"}`}>
            <div className="space-y-4">
              <div className={`grid gap-4 sm:grid-cols-2 ${hideFacilitySelector ? "xl:grid-cols-2" : "xl:grid-cols-4"}`}>
                <MetricCard label="Damage Reports Today" value={summary.currentPeriod.damageToday} detail="Damage reports filed today" icon={<FileText className="h-4 w-4" />} />
                {isInspectionTracOrg ? (
                  <MetricCard label="RSA Reports Today" value={summary.currentPeriod.rsaToday} detail="RSA reports filed today" icon={<ShieldAlert className="h-4 w-4" />} />
                ) : null}
                <MetricCard accent label="Total Damage Reports" value={summary.totals.damageReports} detail={`Month to date ${formatNumber(summary.currentPeriod.damageMonthToDate)}`} icon={<TriangleAlert className="h-4 w-4" />} />
                {!hideFacilitySelector ? (
                  <MetricCard label="Active Facilities" value={summary.totals.facilities} detail="Facilities with current directory data" icon={<LayoutGrid className="h-4 w-4" />} />
                ) : null}
              </div>

              <Card className="overflow-hidden">
                <CardHeader
                  title="Report Trend"
                  subtitle={hideFacilitySelector ? "30-day stacked daily damage volume." : "30-day stacked daily damage volume by facility."}
                  actions={
                    <button
                      type="button"
                      onClick={() => downloadCsv("facility-damage-reports.csv", buildFilteredReportCsvRows(severityFilteredDamageReports, "facility"))}
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </button>
                  }
                />
                <CardContent className="h-96">
                  <div className="h-full overflow-x-auto">
                    <div className={`h-full ${hideFacilitySelector ? "min-w-0" : "min-w-[980px]"}`}>
                      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                        <BarChart data={facilityTrend.data} margin={{ top: 8, right: 16, left: 0, bottom: 12 }} barCategoryGap="12%" barGap={0}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.colors.grid} />
                          <XAxis
                            dataKey="date"
                            type="category"
                            interval={0}
                            minTickGap={0}
                            tickMargin={8}
                            tickFormatter={(value) => formatEvenDateKeyLabel(String(value))}
                            tick={{ fill: chartTheme.colors.text, fontSize: 11, fontWeight: 700 }}
                            stroke={chartTheme.colors.grid}
                          />
                          <YAxis tick={{ fill: chartTheme.colors.text, fontSize: 13, fontWeight: 700 }} stroke={chartTheme.colors.grid} allowDecimals={false} />
                          <Legend verticalAlign="top" align="left" iconType="square" wrapperStyle={{ paddingBottom: 12, fontSize: 13, fontWeight: 700 }} />
                          <Tooltip content={<NonZeroBarTooltip />} labelFormatter={(value) => formatDateKeyLabel(String(value))} />
                          {facilityTrend.keys.map((facility, index) => (
                          <Bar
                              key={facility}
                              dataKey={facility}
                              stackId="damage"
                              name={sanitizeFacilityDisplay(facility)}
                              fill={facilityTrendColors.get(facility) ?? palette[index % palette.length]}
                              cursor="pointer"
                              onClick={() => selectFacilityFromChart(facility)}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {!hideFacilitySelector ? (
              <div className="h-full">
                <DataTableShell
                  className="h-full"
                  title="Facility Damage Submissions"
                  description="Facility names and counts for the current filter."
                  columns={["Facility", { id: "damage-submissions", label: "Damage submissions", align: "left" }]}
                  rowsCount={visibleFacilityStats.length}
                  emptyState={<div className="text-sm text-slate-500">No facility data available.</div>}
                >
                  {visibleFacilityStats.map((facility) => (
                    <tr key={facility.key} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm font-medium text-slate-800">{sanitizeFacilityDisplay(facility.label)}</td>
                      <td className="px-4 py-3 text-left text-sm font-semibold text-slate-900">{formatNumber(facility.totalReports)}</td>
                    </tr>
                  ))}
                </DataTableShell>
              </div>
            ) : null}
          </div>

          {!hideInspectorSections ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Card className="overflow-hidden">
                <CardHeader title="Inspector Comparison" subtitle="Select an inspector to filter the severity detail card." />
                <CardContent className="space-y-2">
                  <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                    {inspectorChoices.length ? inspectorChoices.map((inspector) => {
                      const active = inspectorEmailFilter.toLowerCase() === inspector.email.toLowerCase();
                      return (
                        <button
                          key={inspector.email}
                          type="button"
                          onClick={() => toggleInspectorFilter(inspector.email)}
                          className={`flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                            active ? "border-blue-300 bg-blue-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{inspector.label}</p>
                            <p className="text-xs text-slate-500">{inspector.email}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-black text-slate-950">{formatNumber(inspector.reportCount)}</p>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Reports</p>
                          </div>
                        </button>
                      );
                    }) : (
                      <p className="px-1 py-8 text-center text-sm text-slate-500">No inspector data available.</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader
                  title="Inspector Report Trend"
                  subtitle="30-day stacked daily damage volume by submitter."
                  actions={
                    <button
                      type="button"
                      onClick={() => downloadCsv("inspector-damage-reports.csv", buildFilteredReportCsvRows(severityFilteredDamageReports, "inspector"))}
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <Download className="h-4 w-4" />
                      Export
                    </button>
                  }
                />
                <CardContent className="h-96">
                  <div className="h-full overflow-x-auto">
                    <div className="min-w-[760px] h-full">
                      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                        <BarChart data={inspectorTrend.data} margin={{ top: 8, right: 16, left: 0, bottom: 12 }} barCategoryGap="18%" barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.colors.grid} />
                          <XAxis
                            dataKey="date"
                            type="category"
                            interval={0}
                            minTickGap={0}
                            tickMargin={8}
                            tickFormatter={(value) => formatEvenDateKeyLabel(String(value))}
                            tick={{ fill: chartTheme.colors.text, fontSize: 11, fontWeight: 700 }}
                            stroke={chartTheme.colors.grid}
                          />
                          <YAxis tick={{ fill: chartTheme.colors.text, fontSize: 13, fontWeight: 700 }} stroke={chartTheme.colors.grid} allowDecimals={false} />
                          <Tooltip content={<NonZeroBarTooltip />} labelFormatter={(value) => formatDateKeyLabel(String(value))} />
                          {inspectorTrend.keys.map((inspector, index) => (
                            <Bar
                              key={inspector}
                              dataKey={inspector}
                              stackId="damage"
                              name={inspector}
                              fill={palette[index % palette.length]}
                              barSize={30}
                              cursor="pointer"
                              onClick={() => selectInspectorFromChart(inspector)}
                            />
                          ))}
                          <Legend verticalAlign="top" align="left" iconType="square" wrapperStyle={{ paddingBottom: 12, fontSize: 13, fontWeight: 700 }} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="overflow-hidden">
              <CardHeader
                title="Severity Detail"
                subtitle={
                  selectedModelFilter === "all"
                    ? "Six-level breakdown from the current damage payload."
                    : `Filtered to model ${selectedModelFilter}.`
                }
                actions={
                  <div className="flex min-w-[220px] flex-col items-end gap-1">
                    <select
                      value={selectedModelFilter}
                      onChange={(event) => setSelectedModelFilter(event.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="all">All models</option>
                      {modelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{formatNumber(chartFilteredDamageReports.length)} reports</p>
                  </div>
                }
              />
              <CardContent className="flex h-[760px] flex-col p-0">
                <div className="flex min-h-0 flex-1 items-center justify-center px-6 pt-6 pb-4">
                  <div className="h-full min-h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                      <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                        <Tooltip content={<PieSummaryTooltip />} />
                        <Pie
                          data={severityPieData}
                          dataKey="count"
                          nameKey="name"
                          outerRadius={100}
                          cx="50%"
                          cy="48%"
                          label={({ name, percent = 0 }) => (Number(percent) > 0 ? `${String(name).slice(0, 18)} ${(percent * 100).toFixed(0)}%` : "")}
                          labelLine={false}
                          onClick={(_, index) => {
                            const item = severityPieData[index ?? -1];
                            if (item) {
                              const level = String(item.name).split(" - ")[0];
                              setSelectedSeverityLevel((current) => (current === level ? "all" : level));
                            }
                          }}
                        >
                          {severityPieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          height={60}
                          wrapperStyle={{ paddingTop: 10, fontSize: 12, fontWeight: 700, whiteSpace: "normal" }}
                        />
                      </PieChart>
                  </ResponsiveContainer>
                  </div>
                </div>
                <ChartFooterTable
                  title="Section car rows"
                  subtitle={selectedModelFilter === "all" ? "Total rows per severity section." : "Model rows per severity section for the selected model."}
                  items={severityFooterRows}
                  showSeverityPills
                />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader
                title="Top Damage Areas"
                subtitle="Pie chart for the current filtered data."
                actions={
                  <div className="flex min-w-[220px] flex-col items-end gap-1">
                    <select
                      value={selectedModelFilter}
                      onChange={(event) => setSelectedModelFilter(event.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="all">All models</option>
                      {modelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                      {formatNumber(chartFilteredDamageReports.length)} reports
                    </p>
                  </div>
                }
              />
              <CardContent className="flex h-[760px] flex-col p-0">
                <div className="flex min-h-0 flex-1 items-center justify-center px-6 pt-6 pb-4">
                  <div className="h-full min-h-[360px] w-full">
                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                      <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                        <Tooltip content={<PieSummaryTooltip />} />
                        <Pie
                          data={areaPieData}
                          dataKey="count"
                          nameKey="name"
                          outerRadius={100}
                          cx="50%"
                          cy="48%"
                          label={({ name, percent = 0, index = 0 }) => getPieSliceLabel(String(name), Number(percent), Number(index))}
                          labelLine={false}
                          onClick={(_, index) => {
                            const item = areaPieData[index ?? -1];
                            if (item) {
                              selectAreaFromPie(item.name);
                            }
                          }}
                        >
                          {areaPieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend
                          verticalAlign="bottom"
                          align="center"
                          height={60}
                          wrapperStyle={{ paddingTop: 10, fontSize: 12, fontWeight: 700, whiteSpace: "normal" }}
                        />
                      </PieChart>
                  </ResponsiveContainer>
                  </div>
                </div>
                <ChartFooterTable
                  title="Section car rows"
                  subtitle={selectedModelFilter === "all" ? "Total rows per area section." : "Model rows per area section for the selected model."}
                  items={areaFooterRows}
                  showRowCount={false}
                />
              </CardContent>
            </Card>
          </div>

    </div>
  );
}
