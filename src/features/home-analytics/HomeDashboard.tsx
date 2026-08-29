"use client";
/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  Filter,
  FileText,
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
  type PieLabelRenderProps,
} from "recharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { PageLoadingScreen } from "@/components/ui/PageLoadingScreen";
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
import {
  usePortalDirectorySnapshot,
  useDashboardAnalyticsSnapshot,
  useHomeAnalyticsSnapshot,
} from "@/lib/portalData";
import { usePortalSession } from "@/lib/portalSession";
import { getPortalSuborgValue } from "@/lib/portalOrganizations";
import { buildFacilityDamageStats } from "@/lib/facilityDamageStats";
import { chartTheme } from "@/lib/chartTheme";
import { DAMAGE_SEVERITIES } from "@/lib/docudent/damageTaxonomy";
import { resolveDamageReportLocationName, resolveRsaFacilityLabel, stripFacilitySuffix } from "@/lib/reportUtils";
import { fetchDashboardAnalytics, type DashboardAnalyticsParams } from "@/lib/services/reportService";
import {
  normalizeLabel,
  normalizeSearchText,
  matchesDamageReportFilters,
  DEFAULT_DAMAGE_REPORT_FILTERS,
  DAMAGE_FILTER_OPTIONS,
  getActiveInspectionTypeOptions,
} from "@/lib/reportFilters";
import type { FacilityDamageStats } from "@/lib/facilityDamageStats";
import type { ReportDamageApiRow, RsaReportApiRow } from "@/lib/types";
import { severityPillClass } from "@/lib/severityTheme";
import { normalizeReportListRow, normalizeReportListRows, type NormalizedReportListRow } from "@/lib/reportNormalizer";
import {
  DASHBOARD_ANALYTICS_ENDPOINT,
  HOME_ANALYTICS_FILTER_KEYS,
  HOME_DEFAULT_TREND_DAYS,
} from "@/features/home-analytics/constants";
import {
  readAnalyticsNumber,
  readAnalyticsSplitPair,
  readAnalyticsString,
} from "@/features/home-analytics/analytics-adapters";
import {
  buildDashboardAnalyticsParams,
  getActiveHomeFilterChips,
  getDefaultHomeAnalyticsFilters,
  getHomeFilterKeysWithValues,
  parseHomeAnalyticsFilters,
  serializeHomeAnalyticsFilters,
} from "@/features/home-analytics/filter-state";
import { DamageClearMetricValue } from "@/features/home-analytics/components/DamageClearMetricValue";
import { MetricCard } from "@/features/home-analytics/components/MetricCard";
import type { HomeAnalyticsFilters, HomeCountMode, HomeFilterKey } from "@/features/home-analytics/types";
import { getPortalAnalyticsFilterOptions } from "@/lib/analyticsFilterOptions";
import { formatFacilityDisplayName } from "@/lib/facilityDisplay";

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
  damageCount?: number;
  clearCount?: number;
  hasClearDamageSplit?: boolean;
  severity: DashboardSeverityItem[];
};

type PieAreaDatum = {
  name: string;
  count: number;
  fill: string;
  vinSamples?: string[];
};

type PieBreakdownItem = {
  label: string;
  count: number;
};

type PieFacilityBreakdownState = {
  key: string;
  status: "idle" | "loading" | "ready" | "error";
  items: PieBreakdownItem[];
};

type DamageBreakdownItem = {
  label: string;
  count: number;
};

type TrendBreakdownMap = Record<string, DamageBreakdownItem[]>;

type TrendRow = {
  date: string;
  __breakdown?: TrendBreakdownMap;
  [series: string]: string | number | TrendBreakdownMap | undefined;
};

type ChartTooltipItem = {
  name?: string | number;
  value?: number | string;
  color?: string;
  fill?: string;
  dataKey?: string | number;
  payload?: {
    name?: string | number;
    __breakdown?: TrendBreakdownMap;
    vinSamples?: string[];
  };
};

type ChartTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ChartTooltipItem[];
};

type DashboardSummary = {
  totals: {
    totalReports: number;
    damageReports: number;
    noDamageReports: number;
    twentyFourHourReports: number;
    inspection02Reports: number;
    rsaReports: number;
    facilities: number;
    vins: number;
    entries: number;
  };
  currentPeriod: {
    damageToday: number;
    clearToday: number;
    rsaToday: number;
    reportsToday: number;
    damageLast7Days: number;
    rsaLast7Days: number;
    reportsLast7Days: number;
    reportsThisWeek: number;
    damageMonthToDate: number;
    damageYearToDate: number;
    reportsThisMonth: number;
    reportsThisYear: number;
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

type DashboardAnalyticsPayload = NonNullable<Awaited<ReturnType<typeof useDashboardAnalyticsSnapshot>>["data"]>;

type AnalyticsFacilityStat = {
  key: string;
  label: string;
  totalReports: number;
  damageReports: number;
  noDamageReports: number;
  rsaReports: number;
  reportsToday: number;
  reportsLast7Days: number;
  reportsThisMonth: number;
  reportsThisYear: number;
  vins: number;
  entries: number;
};

type ReportTrendKey = "totalReports" | "damageReports" | "rsaReports";

type ReportTrendView = {
  mode: "daily" | "facility";
  xKey: "date" | "facility";
  keys: ReportTrendKey[];
  data: Array<Record<string, string | number>>;
};

type InspectionOutcome = "damage" | "clear" | "unknown";
type ExportCardContext = {
  filenamePrefix: string;
  cardRows: unknown[][];
};
const SEVERITY_LABELS: Record<number, string> = {
  1: "1 inch or less (3 centimeters or less)",
  2: "More than 1 inch through 3 inches (3 through 8 centimeters)",
  3: "More than 3 inches through 6 inches (8 through 15 centimeters)",
  4: "More than 6 inches through 12 inches (15 through 30 centimeters)",
  5: "More than 12 inches (30 centimeters or more)",
  6: "Missing / Major Damage",
};

const INSPECTION_SUBMISSIONS_SERIES = "Inspection Submissions";

const REQUIRED_STATS_TOTAL_KEYS = [
  "totalReports",
  "damageReports",
  "noDamageReports",
  "reportsToday",
  "damageReportsToday",
] as const;
const REQUIRED_STATS_CURRENT_PERIOD_KEYS = ["damageToday", "damageMonthToDate"] as const;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function readAnalyticsTotal(analytics: DashboardAnalyticsPayload | undefined, keys: string[]): number | null {
  const totals = analytics?.totals as Record<string, unknown> | undefined;
  if (!totals) return null;
  for (const key of keys) {
    const value = totals[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function readAnalyticsCurrentPeriod(analytics: DashboardAnalyticsPayload | undefined, keys: string[]): number | null {
  const currentPeriod = analytics?.currentPeriod as Record<string, unknown> | undefined;
  if (!currentPeriod) return null;
  for (const key of keys) {
    const value = currentPeriod[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csvRowsToText(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\n");
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
  const csv = csvRowsToText(rows);
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function exportTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function exportVisualizedCardCsv(context: ExportCardContext): void {
  if (!context.cardRows.length) return;
  downloadCsv(`${context.filenamePrefix}-${exportTimestamp()}.csv`, context.cardRows);
}

function downloadJson(filename: string, value: unknown): void {
  const json = JSON.stringify(value, null, 2);
  const url = URL.createObjectURL(new Blob([json], { type: "application/json;charset=utf-8;" }));
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
  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const [, year, month, day] = dateOnly;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function asPlainRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readDisplayString(value: unknown): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function firstDisplayString(...values: unknown[]): string {
  for (const value of values) {
    const displayValue = readDisplayString(value);
    if (displayValue) {
      return displayValue;
    }
  }
  return "";
}

function collectLocationDisplayValues(value: unknown): string[] {
  const record = asPlainRecord(value);
  if (!record) return [];
  const payload = asPlainRecord(record.payload);
  const nestedReport = asPlainRecord(record.report);
  const raw = asPlainRecord(record.raw);
  const metadata = asPlainRecord(record.metadata);
  const payloadMetadata = asPlainRecord(payload?.metadata);
  const nestedReportMetadata = asPlainRecord(nestedReport?.metadata);
  const rawMetadata = asPlainRecord(raw?.metadata);
  const locationRecords = [
    asPlainRecord(record.location),
    asPlainRecord(payload?.location),
    asPlainRecord(nestedReport?.location),
    asPlainRecord(raw?.location),
    asPlainRecord(metadata?.location),
    asPlainRecord(payloadMetadata?.location),
    asPlainRecord(nestedReportMetadata?.location),
    asPlainRecord(rawMetadata?.location),
  ];
  const sourceRecords = [record, payload, nestedReport, raw, metadata, payloadMetadata, nestedReportMetadata, rawMetadata, ...locationRecords].filter(
    (item): item is Record<string, unknown> => Boolean(item)
  );
  const keys = [
    "facilityName",
    "facility_name",
    "facility",
    "locationLabel",
    "location_label",
    "locationName",
    "location_name",
    "navigation",
    "yardName",
    "yard_name",
    "yard",
    "yardLabel",
    "yard_label",
  ];
  return sourceRecords.flatMap((source) => keys.map((key) => readDisplayString(source[key]))).filter(Boolean);
}

function collectLocationIdValues(value: unknown): string[] {
  const record = asPlainRecord(value);
  if (!record) return [];
  const payload = asPlainRecord(record.payload);
  const nestedReport = asPlainRecord(record.report);
  const raw = asPlainRecord(record.raw);
  const metadata = asPlainRecord(record.metadata);
  const payloadMetadata = asPlainRecord(payload?.metadata);
  const nestedReportMetadata = asPlainRecord(nestedReport?.metadata);
  const rawMetadata = asPlainRecord(raw?.metadata);
  const locationRecords = [
    asPlainRecord(record.location),
    asPlainRecord(payload?.location),
    asPlainRecord(nestedReport?.location),
    asPlainRecord(raw?.location),
    asPlainRecord(metadata?.location),
    asPlainRecord(payloadMetadata?.location),
    asPlainRecord(nestedReportMetadata?.location),
    asPlainRecord(rawMetadata?.location),
  ];
  const sourceRecords = [record, payload, nestedReport, raw, metadata, payloadMetadata, nestedReportMetadata, rawMetadata, ...locationRecords].filter(
    (item): item is Record<string, unknown> => Boolean(item)
  );
  const keys = ["facilityId", "facility_id", "locationId", "location_id"];
  return sourceRecords.flatMap((source) => keys.map((key) => readDisplayString(source[key]))).filter(Boolean);
}

function resolveNormalizedRowFacilityValue(row: NormalizedReportListRow): string {
  return firstDisplayString(row.facilityName, row.locationLabel, row.yardName, ...collectLocationDisplayValues(row.raw));
}

function mergeReportRecords(existing: unknown, incoming: unknown): unknown {
  const existingRecord = asPlainRecord(existing);
  const incomingRecord = asPlainRecord(incoming);
  if (!existingRecord || !incomingRecord) {
    return incomingRecord ?? existingRecord ?? incoming;
  }

  const merged: Record<string, unknown> = { ...existingRecord, ...incomingRecord };
  const location = {
    ...(asPlainRecord(existingRecord.location) ?? {}),
    ...(asPlainRecord(incomingRecord.location) ?? {}),
  };
  if (Object.keys(location).length) {
    merged.location = location;
  }
  const metadata = {
    ...(asPlainRecord(existingRecord.metadata) ?? {}),
    ...(asPlainRecord(incomingRecord.metadata) ?? {}),
  };
  if (Object.keys(metadata).length) {
    merged.metadata = metadata;
  }

  const preserveTextKeys = [
    "facilityName",
    "facility_name",
    "facility",
    "locationLabel",
    "location_label",
    "locationName",
    "location_name",
    "navigation",
    "yardName",
    "yard_name",
    "yard",
    "yardLabel",
    "yard_label",
    "yardId",
    "yard_id",
    "facilityId",
    "facility_id",
    "locationId",
    "location_id",
  ];
  for (const key of preserveTextKeys) {
    if (!readDisplayString(incomingRecord[key]) && readDisplayString(existingRecord[key])) {
      merged[key] = existingRecord[key];
    }
  }

  if (!Array.isArray(incomingRecord.damage_entries) && Array.isArray(existingRecord.damage_entries)) {
    merged.damage_entries = existingRecord.damage_entries;
  }
  if (!Array.isArray(incomingRecord.damageEntries) && Array.isArray(existingRecord.damageEntries)) {
    merged.damageEntries = existingRecord.damageEntries;
  }
  return merged;
}

function mergeReportListSources(...sources: unknown[][]): unknown[] {
  const rowsByKey = new Map<string, unknown>();
  for (const source of sources) {
    for (const item of source ?? []) {
      const normalized = normalizeReportListRow(item);
      const key = normalized.reportId || normalized.id;
      if (!key) continue;
      const existing = rowsByKey.get(key);
      rowsByKey.set(key, existing ? mergeReportRecords(existing, item) : item);
    }
  }
  return [...rowsByKey.values()];
}

function isLocalDebugHost(hostname: string): boolean {
  const normalized = hostname.split(":")[0].toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "0.0.0.0"
  );
}

function normalizedRowToDamageReport(row: NormalizedReportListRow): ReportDamageApiRow {
  const rawRecord = (asPlainRecord(row.raw) ?? {}) as Partial<ReportDamageApiRow> & Record<string, unknown>;
  const rawLocation = asPlainRecord(rawRecord.location);
  const locationId = firstDisplayString(row.facilityId, ...collectLocationIdValues(rawRecord));
  const facilityValue = resolveNormalizedRowFacilityValue(row);
  const locationLabel = firstDisplayString(row.locationLabel, rawRecord.location_label, rawLocation?.location_label, facilityValue);
  const locationName = firstDisplayString(
    row.locationLabel,
    row.facilityName,
    rawRecord.location_name,
    rawLocation?.location_name,
    facilityValue
  );
  const facilityName = firstDisplayString(row.facilityName, rawRecord.facility, rawRecord.facility_name, rawLocation?.facility, facilityValue);
  const navigation = firstDisplayString(row.locationLabel, rawRecord.navigation, rawLocation?.navigation, facilityValue);
  const yardName = firstDisplayString(
    row.yardName,
    rawRecord.yard,
    rawRecord.yard_name,
    rawRecord.yardName,
    rawRecord.yard_label,
    rawLocation?.yard,
    rawLocation?.yard_name,
    rawLocation?.yardName,
    rawLocation?.yard_label
  );
  const yardId = firstDisplayString(row.yardId, rawRecord.yard_id, rawRecord.yardId, rawLocation?.yard_id, rawLocation?.yardId);
  const damageEntries = Array.isArray(rawRecord.damage_entries)
    ? rawRecord.damage_entries
    : Array.isArray(rawRecord.damageEntries)
      ? rawRecord.damageEntries
      : [];
  return {
    ...rawRecord,
    report_id: row.reportId || row.id,
    vin: row.vin,
    make: rawRecord.make as string | undefined,
    model: rawRecord.model as string | undefined,
    year: typeof rawRecord.year === "number" ? (rawRecord.year as number) : undefined,
    inspection_type_number: row.inspectionTypeNumber,
    status: row.status as ReportDamageApiRow["status"],
    inspector_email: row.inspectorEmail,
    location_id: locationId,
    facility_id: firstDisplayString(row.facilityId, rawRecord.facility_id, rawLocation?.facility_id, locationId),
    location_label: locationLabel,
    location_name: locationName,
    facility: facilityName,
    navigation,
    yard: yardName,
    yard_id: yardId,
    yard_name: yardName,
    yard_label: yardName,
    created_at: row.createdAt || row.submittedAt,
    updated_at: row.updatedAt,
    photo_urls: row.photoUrls,
    splat_urls: row.splatUrls,
    pdf_url: row.pdfUrl,
    damage_entries: damageEntries as ReportDamageApiRow["damage_entries"],
  };
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

function clampDateRangeToThirtyDays(
  from?: string | null,
  to?: string | null,
  defaultEndDate?: Date | null
): { start: Date; end: Date } {
  const today = new Date();
  const parsedEnd = safeDate(to || null) ?? defaultEndDate ?? today;
  const parsedStart = safeDate(from || null) ?? addDays(parsedEnd, -29);
  const end = parsedEnd > today ? today : parsedEnd;
  const start = parsedStart > end ? end : parsedStart;
  const span = daysBetween(start, end);
  return {
    start: span > 29 ? addDays(end, -29) : start,
    end,
  };
}

function normalizedRowDate(row: NormalizedReportListRow): Date | null {
  return safeDate(row.submittedAt || row.createdAt || row.updatedAt || null);
}

function normalizedRowFacilityLabel(row: NormalizedReportListRow): string {
  return normalizeFacilityDisplayLabel(resolveNormalizedRowFacilityValue(row));
}

function normalizedRowHasDamage(row: NormalizedReportListRow): boolean {
  const status = `${row.damageStatus || row.scanStatus || row.status || ""}`.trim().toLowerCase();
  if (status === "no_damage" || status === "clear" || row.sourceType === "inspection_scan_submission") {
    return false;
  }
  return status === "damage" || row.photoCount > 0 || row.hasPhotos || row.hasSplat || row.hasPdf;
}

const HOME_CHART_PALETTE = [
  "#0072b2",
  "#e69f00",
  "#009e73",
  "#cc79a7",
  "#d55e00",
  "#56b4e9",
  "#7c3aed",
  "#65a30d",
  "#be123c",
  "#0f766e",
  "#a855f7",
  "#4b5563",
] as const;

function buildFacilityColorMap(labels: string[]): Record<string, string> {
  return [...new Set(labels)]
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, string>>((acc, label, index) => {
      acc[label] = HOME_CHART_PALETTE[index % HOME_CHART_PALETTE.length];
      return acc;
    }, {});
}

const INSPECTOR_CHART_PALETTE = HOME_CHART_PALETTE;

function buildInspectorColorMap(labels: string[]): Record<string, string> {
  return [...new Set(labels)]
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, string>>((colors, label, index) => {
      colors[label] = INSPECTOR_CHART_PALETTE[index % INSPECTOR_CHART_PALETTE.length];
      return colors;
    }, {});
}

function buildHomeDateBounds(dates: Date[]): { minDate: string; maxDate: string } {
  const today = new Date();
  const sortedDates = dates
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((left, right) => left.getTime() - right.getTime());
  const latestAvailableDate = sortedDates.at(-1);
  const maxDate = latestAvailableDate && latestAvailableDate < today ? latestAvailableDate : today;
  const defaultMinDate = addDays(maxDate, -(HOME_DEFAULT_TREND_DAYS - 1));
  const earliestAvailableDate = sortedDates[0];
  const minDate = earliestAvailableDate && earliestAvailableDate < defaultMinDate ? earliestAvailableDate : defaultMinDate;
  return {
    minDate: toDateInputValue(minDate),
    maxDate: toDateInputValue(maxDate),
  };
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

function getDamageEntryCount(report: ReportDamageApiRow): number {
  return Array.isArray(report.damage_entries) ? report.damage_entries.length : 0;
}

function countDamageEntries(reports: ReportDamageApiRow[]): number {
  return reports.reduce((sum, report) => sum + getDamageEntryCount(report), 0);
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

function readUnknownArray(...values: unknown[]): unknown[] {
  for (const value of values) {
    if (Array.isArray(value)) {
      return value;
    }
  }
  return [];
}

function getNormalizedRowDamageEntries(row: NormalizedReportListRow): unknown[] {
  const raw = row.raw ?? {};
  return readUnknownArray(raw.damage_entries, raw.damageEntries, raw.damage_summary, raw.damageSummary);
}

function getNormalizedRowDamageEntryCount(row: NormalizedReportListRow): number {
  return getNormalizedRowDamageEntries(row).length;
}

function normalizeInspectionStatus(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

function getNormalizedRowOutcome(row: NormalizedReportListRow): InspectionOutcome {
  const damageEntryCount = getNormalizedRowDamageEntryCount(row);
  const statuses = [row.damageStatus, row.scanStatus, row.status].map(normalizeInspectionStatus).filter(Boolean);
  if (
    damageEntryCount > 0 ||
    statuses.some((status) => ["damage", "damaged", "damage_found"].includes(status)) ||
    row.hasPhotos ||
    row.hasSplat
  ) {
    return "damage";
  }
  if (
    statuses.some((status) => ["no_damage", "clear", "clean", "completed", "complete"].includes(status)) ||
    normalizeInspectionStatus(row.sourceType).includes("inspection_scan")
  ) {
    return "clear";
  }
  return "clear";
}

function getReportOutcome(report: ReportDamageApiRow): InspectionOutcome {
  const record = report as unknown as Record<string, unknown>;
  const damageEntryCount = getDamageEntryCount(report);
  const statuses = [
    report.status,
    record.damageStatus,
    record.damage_status,
    record.scanStatus,
    record.scan_status,
    asPlainRecord(report.metadata)?.damageStatus,
    asPlainRecord(report.metadata)?.scanStatus,
  ]
    .map(normalizeInspectionStatus)
    .filter(Boolean);
  if (
    damageEntryCount > 0 ||
    statuses.some((status) => ["damage", "damaged", "damage_found"].includes(status)) ||
    (Array.isArray(report.photo_urls) && report.photo_urls.length > 0) ||
    (Array.isArray(report.splat_urls) && report.splat_urls.length > 0)
  ) {
    return "damage";
  }
  if (
    statuses.some((status) => ["no_damage", "clear", "clean", "completed", "complete"].includes(status)) ||
    normalizeInspectionStatus(asPlainRecord(report.metadata)?.sourceType).includes("inspection_scan")
  ) {
    return "clear";
  }
  return "clear";
}

function getReportOutcomeLabel(report: ReportDamageApiRow): string {
  const outcome = getReportOutcome(report);
  if (outcome === "damage") return "Damage";
  if (outcome === "clear") return "Clear";
  return "Unknown";
}

function getReportInspectionTypeDisplay(report: ReportDamageApiRow): string {
  const raw = String(report.inspection_type_number ?? "").trim();
  if (!raw) return "";
  const label = getActiveInspectionTypeOptions([report]).find((option) => option.number === raw)?.label;
  return label ? `${raw} - ${label}` : raw;
}

function collectVinSamples(reports: ReportDamageApiRow[], limit = 8): string[] {
  return Array.from(new Set(reports.map((report) => (report.vin ?? "").trim().toUpperCase()).filter(Boolean))).slice(0, limit);
}

function buildInspectionOutcomeCounts(reports: ReportDamageApiRow[]) {
  let damageCount = 0;
  let clearCount = 0;
  let unknownCount = 0;
  for (const report of reports) {
    const outcome = getReportOutcome(report);
    if (outcome === "damage") damageCount += 1;
    else if (outcome === "clear") clearCount += 1;
    else unknownCount += 1;
  }
  return {
    inspectionCount: reports.length,
    damageCount,
    clearCount,
    unknownCount,
    vinSamples: collectVinSamples(reports),
  };
}

function damageBreakdownLabelForEntry(entry: Record<string, unknown>): string {
  const area = normalizeLabel(
    getDamageEntryField(entry, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"])
  );
  const type = normalizeLabel(
    getDamageEntryField(entry, ["damage_type", "damage_type_code", "damage_type_name", "type", "type_code"])
  );
  return [
    area !== "Unavailable" ? area : "",
    type !== "Unavailable" ? type : "",
  ]
    .filter(Boolean)
    .join(" / ") || "Damage entry";
}

function buildDamageBreakdownItems(report: ReportDamageApiRow): DamageBreakdownItem[] {
  const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  if (!entries.length) {
    return [{ label: "Damage report", count: 1 }];
  }
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const label = damageBreakdownLabelForEntry(entry as unknown as Record<string, unknown>);
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function addDamageBreakdown(row: TrendRow, series: string, report: ReportDamageApiRow): void {
  const breakdownMap = row.__breakdown ?? {};
  const existingCounts = new Map((breakdownMap[series] ?? []).map((item) => [item.label, item.count] as const));
  for (const item of buildDamageBreakdownItems(report)) {
    existingCounts.set(item.label, (existingCounts.get(item.label) ?? 0) + item.count);
  }
  breakdownMap[series] = [...existingCounts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, 8);
  row.__breakdown = breakdownMap;
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

function groupSeverityCounts(reports: ReportDamageApiRow[], countMode: HomeCountMode = "reports") {
  const counts = new Map<number, number>();
  let low = 0;
  let medium = 0;
  let high = 0;
  for (const report of reports) {
    if (countMode === "damages") {
      const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
      for (const entry of entries) {
        const severity = resolveDamageSeverity(entry as unknown as Record<string, unknown>);
        if (!severity) continue;
        counts.set(severity, (counts.get(severity) ?? 0) + 1);
        if (severity <= 2) low += 1;
        else if (severity <= 4) medium += 1;
        else high += 1;
      }
    } else {
      const severity = getReportSeverity(report);
      if (!severity) continue;
      counts.set(severity, (counts.get(severity) ?? 0) + 1);
      if (severity <= 2) low += 1;
      else if (severity <= 4) medium += 1;
      else high += 1;
    }
  }
  return { counts, low, medium, high, reports: reports.length, entries: countDamageEntries(reports) };
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
  "1": "#16a34a",
  "2": "#65a30d",
  "3": "#d97706",
  "4": "#ea580c",
  "5": "#dc2626",
  "6": "#7c2d12",
};

const AREA_PIE_COLORS = ["#2563eb", "#0f766e", "#d97706", "#7c3aed", "#db2777"] as const;

const SEVERITY_SHORT_LABELS: Record<string, string> = {
  "1": "1 in or less",
  "2": "1–3 in",
  "3": "3–6 in",
  "4": "6–12 in",
  "5": ">12 in",
  "6": "Missing / major",
};

function buildPieData(items: { name: string; count: number }[]) {
  return items.map((item, index) => ({
    ...item,
    fill: HOME_CHART_PALETTE[index % HOME_CHART_PALETTE.length],
  }));
}

function buildAllAreaPieData(items: { name: string; count: number }[]): PieAreaDatum[] {
  return items
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5)
    .map((item, index) => ({
      ...item,
      fill: AREA_PIE_COLORS[index % AREA_PIE_COLORS.length],
    }));
}

function buildSelectedAreaPieData(items: { name: string; count: number }[], selectedArea: string): PieAreaDatum[] {
  const selected = selectedArea.trim();
  return buildAllAreaPieData(items).map((item) => ({
    ...item,
    count: !selected || item.name === selected ? item.count : 0,
  }));
}

function buildSeverityPieData(items: DashboardSeverityItem[]) {
  return items.map((item) => ({
    name: item.label.startsWith(`${item.level} -`) ? item.label : `${item.level} - ${item.label}`,
    count: item.count,
    fill: SEVERITY_PIE_COLORS[item.level] ?? "#cbd5e1",
  }));
}

function normalizeSeverityFilterValue(value: string | null | undefined): string {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "all") return "all";
  const leadingLevel = normalized.match(/^[1-6](?=\D|$)/)?.[0];
  return leadingLevel ?? "all";
}

function buildSelectedSeverityPieData(items: DashboardSeverityItem[], selectedLevel: string): Array<{ name: string; count: number; fill: string }> {
  const normalizedSelected = normalizeSeverityFilterValue(selectedLevel);
  return buildSeverityPieData(items).map((item) => ({
    ...item,
    count: normalizedSelected === "all" || String(item.name).startsWith(`${normalizedSelected} `) ? item.count : 0,
  }));
}

function getPieLegendLabel(name: string, kind: "severity" | "area"): string {
  if (kind === "severity") {
    const level = name.split(" - ")[0];
    return SEVERITY_SHORT_LABELS[level] ?? name.replace(/^\d+\s*-\s*/, "");
  }
  return name;
}

type PieCalloutDatum = {
  name: string;
  count: number;
};

function wrapPieCalloutLabel(label: string): string[] {
  const maxLineLength = label.length > 22 ? 13 : 16;
  const words = label.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];

  words.forEach((word) => {
    const current = lines[lines.length - 1];
    if (!current || `${current} ${word}`.length > maxLineLength) {
      lines.push(word);
    } else {
      lines[lines.length - 1] = `${current} ${word}`;
    }
  });

  return lines;
}

function getPieCalloutFontSize(lineCount: number): number {
  return lineCount > 2 ? 9 : 10;
}

function buildPieCalloutPositions(
  data: PieCalloutDatum[],
  cx: number,
  cy: number,
  outerRadius: number,
  kind: "severity" | "area"
) {
  const total = data.reduce((sum, item) => sum + Math.max(Number(item.count) || 0, 0), 0);
  const positions = new Map<number, { labelY: number }>();
  if (!total) return positions;

  let cumulative = 0;
  const candidates = data
    .map((item, index) => {
      const count = Math.max(Number(item.count) || 0, 0);
      const midAngle = 90 - ((cumulative + count / 2) / total) * 360;
      cumulative += count;
      const cosine = Math.cos(-midAngle * (Math.PI / 180));
      const sine = Math.sin(-midAngle * (Math.PI / 180));
      const label = getPieLegendLabel(item.name, kind);
      const lines = wrapPieCalloutLabel(label);
      const fontSize = getPieCalloutFontSize(lines.length);
      return {
        index,
        count,
        isRightSide: cosine >= 0,
        naturalY: cy + (outerRadius + 24) * sine,
        height: fontSize + lines.length * (fontSize + 2) + 12,
      };
    })
    .filter((candidate) => candidate.count > 0);

  [false, true].forEach((isRightSide) => {
    const side = candidates
      .filter((candidate) => candidate.isRightSide === isRightSide)
      .sort((left, right) => left.naturalY - right.naturalY);
    if (!side.length) return;

    const minimumY = cy - outerRadius * 1.16;
    const maximumY = cy + outerRadius * 1.16;
    const gap = 9;
    const adjusted: Array<(typeof side)[number] & { labelY: number }> = [];
    side.forEach((candidate) => {
      const previous = adjusted[adjusted.length - 1];
      const minimumNextY = previous
        ? previous.labelY + previous.height / 2 + candidate.height / 2 + gap
        : minimumY + candidate.height / 2;
      adjusted.push({ ...candidate, labelY: Math.max(candidate.naturalY, minimumNextY) });
    });

    const overflow = adjusted[adjusted.length - 1].labelY + adjusted[adjusted.length - 1].height / 2 - maximumY;
    if (overflow > 0) adjusted.forEach((candidate) => { candidate.labelY -= overflow; });

    for (let index = adjusted.length - 2; index >= 0; index -= 1) {
      const current = adjusted[index];
      const next = adjusted[index + 1];
      current.labelY = Math.min(
        current.labelY,
        next.labelY - next.height / 2 - current.height / 2 - gap
      );
    }

    const topOverflow = minimumY - (adjusted[0].labelY - adjusted[0].height / 2);
    if (topOverflow > 0) adjusted.forEach((candidate) => { candidate.labelY += topOverflow; });
    adjusted.forEach((candidate) => positions.set(candidate.index, { labelY: candidate.labelY }));
  });

  return positions;
}

function PieSliceCalloutLabel(
  props: PieLabelRenderProps & { data: PieCalloutDatum[]; kind: "severity" | "area" }
) {
  const cx = Number(props.cx);
  const cy = Number(props.cy);
  const innerRadius = Number(props.innerRadius ?? 0);
  const outerRadius = Number(props.outerRadius ?? 0);
  const midAngle = Number(props.midAngle ?? 0);
  const percent = Number(props.percent ?? 0);
  const index = Number(props.index ?? -1);
  const name = String(props.name ?? props.payload?.name ?? "");
  const count = Number(props.payload?.count ?? 0);
  if (![cx, cy, innerRadius, outerRadius, midAngle, percent, count].every(Number.isFinite) || !name || count <= 0) {
    return null;
  }

  const radians = Math.PI / 180;
  const cosine = Math.cos(-midAngle * radians);
  const sine = Math.sin(-midAngle * radians);
  const sliceCenterRadius = innerRadius + (outerRadius - innerRadius) * 0.62;
  const startX = cx + sliceCenterRadius * cosine;
  const startY = cy + sliceCenterRadius * sine;
  const layout = buildPieCalloutPositions(props.data, cx, cy, outerRadius, props.kind);
  const position = layout.get(index);
  const isRightSide = cosine >= 0;
  const labelX = cx + (outerRadius + 22) * (isRightSide ? 1 : -1);
  const labelY = position?.labelY ?? cy + (outerRadius + 24) * sine;
  const lineEndX = labelX + (isRightSide ? -7 : 7);
  const textAnchor = isRightSide ? "start" : "end";
  const label = getPieLegendLabel(name, props.kind);
  const labelLines = wrapPieCalloutLabel(label);
  const fontSize = getPieCalloutFontSize(labelLines.length);
  const percentage = `${percent < 0.1 ? (percent * 100).toFixed(1) : Math.round(percent * 100)}%`;
  const countLabel = formatNumber(count);
  const textStartY = labelY - (labelLines.length * (fontSize + 2)) / 2;

  return (
    <g aria-hidden="true" pointerEvents="none">
      <path d={`M${startX},${startY} L${lineEndX},${labelY}`} fill="none" stroke="#94a3b8" strokeWidth={1.25} />
      <circle cx={startX} cy={startY} r={2.25} fill="#64748b" />
      <text x={labelX} y={textStartY} textAnchor={textAnchor} fill="#0f172a" fontSize={fontSize} fontWeight={700}>
        <tspan x={labelX} dy="0" fontSize={fontSize + 2} fontWeight={900}>
          {percentage} · {countLabel}
        </tspan>
        {labelLines.map((line, lineIndex) => (
          <tspan key={`${line}-${lineIndex}`} x={labelX} dy={fontSize + 2}>{line}</tspan>
        ))}
      </text>
    </g>
  );
}

function PieMetricStrip({
  value,
  label,
  detail,
}: {
  value: number;
  label: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{label}</p>
        <p className="mt-1 truncate text-xs font-medium text-slate-500">{detail}</p>
      </div>
      <span className="shrink-0 text-2xl font-black tracking-tight text-slate-950">{formatNumber(value)}</span>
    </div>
  );
}

function PieLegendList({
  items,
  total,
  kind,
  onSelect,
}: {
  items: Array<{ name: string; count: number; fill: string }>;
  total: number;
  kind: "severity" | "area";
  onSelect: (name: string) => void;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
      <div className="mb-2 flex items-center justify-between gap-3 px-1">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">Breakdown</p>
        <p className="text-[10px] font-semibold text-slate-400">Click to filter</p>
      </div>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {items.filter((item) => item.count > 0).map((item) => {
          const percent = total > 0 ? (item.count / total) * 100 : 0;
          const label = getPieLegendLabel(item.name, kind);
          return (
            <button
              key={item.name}
              type="button"
              data-testid="pie-legend-item"
              title={item.name}
              aria-label={`${label}: ${formatNumber(item.count)} records`}
              onClick={() => onSelect(item.name)}
              className="flex min-h-10 w-full items-start gap-2.5 rounded-xl border border-transparent bg-white px-3 py-2 text-left transition hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white" style={{ backgroundColor: item.fill }} />
              <span className="min-w-0 flex-1 text-[12px] font-semibold leading-4 text-slate-700">{label}</span>
              <span className="shrink-0 text-[12px] font-black tabular-nums text-slate-950">{formatNumber(item.count)}</span>
              <span className="w-10 shrink-0 text-right text-[11px] font-semibold tabular-nums text-slate-400">
                {percent < 10 ? `${percent.toFixed(1)}%` : `${Math.round(percent)}%`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
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

function normalizeFacilityDisplayLabel(value: string | null | undefined): string {
  const normalized = formatFacilityDisplayName(stripFacilitySuffix((value ?? "").toString())).trim().replace(/\s+/g, " ");
  const lower = normalized.toLowerCase();
  if (
    !normalized ||
    lower === "unknown" ||
    lower === "unknown facility" ||
    lower === "unavailable" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "null" ||
    lower === "undefined"
  ) {
    return "Other";
  }
  return normalized;
}

function resolveHomeFacilityLabel(value: string | null | undefined): string {
  return normalizeFacilityDisplayLabel(value);
}

function isHomeVisibleFacility(_value: string | null | undefined): boolean {
  return true;
}

function facilityDisplayKey(label: string): string {
  return resolveHomeFacilityLabel(label)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "other";
}

function normalizeOrganizationName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function normalizeAnalyticsFacility(item: Record<string, unknown>): AnalyticsFacilityStat {
  const rawLabel = readAnalyticsString(item, ["label", "facility", "name", "navigation", "location_label", "location_name"], "");
  const label = resolveHomeFacilityLabel(rawLabel);
  const rawKey = readAnalyticsString(item, ["id", "facility_id", "location_id", "key"], "");
  const key = label === "Other" ? "other" : rawKey || facilityDisplayKey(label);
  const totalReports = readAnalyticsNumber(item, ["totalReports", "reports", "count"]);
  const splitCounts = readAnalyticsSplitPair(item, "reports");
  const damageReports = splitCounts.hasSplitData ? splitCounts.damageCount : readAnalyticsNumber(item, ["damageReports", "damage_reports"]);
  const noDamageReports = splitCounts.hasSplitData ? splitCounts.clearCount : readAnalyticsNumber(item, ["noDamageReports", "clearReports", "clearCount", "noDamageCount"]);
  const rsaReports = readAnalyticsNumber(item, ["rsaReports", "rsa_reports"]);
  return {
    key,
    label,
    totalReports,
    damageReports,
    noDamageReports,
    rsaReports,
    reportsToday: readAnalyticsNumber(item, ["reportsToday", "today"]),
    reportsLast7Days: readAnalyticsNumber(item, ["reportsLast7Days", "last7Days", "reportsThisWeek"]),
    reportsThisMonth: readAnalyticsNumber(item, ["reportsThisMonth", "monthToDate"]),
    reportsThisYear: readAnalyticsNumber(item, ["reportsThisYear", "yearToDate"]),
    vins: readAnalyticsNumber(item, ["vins", "uniqueVINs"]),
    entries: readAnalyticsNumber(item, ["entries", "damageEntries", "totalDamages"]) || damageReports,
  };
}

function buildReportTrendView(
  analytics: DashboardAnalyticsPayload | undefined,
  facilities: AnalyticsFacilityStat[]
): ReportTrendView {
  const dailyRows = (analytics?.dailyTrend ?? [])
    .map((row) => ({
      date: row.date,
      damageReports: Number(row.damageReports ?? 0),
      rsaReports: Number(row.rsaReports ?? 0),
    }))
    .filter((row) => row.date && (row.damageReports > 0 || row.rsaReports > 0));

  if (dailyRows.length > 0) {
    return {
      mode: "daily",
      xKey: "date",
      keys: ["damageReports", "rsaReports"],
      data: dailyRows,
    };
  }

  const facilityRows = facilities
    .filter((facility) => facility.totalReports > 0 || facility.damageReports > 0 || facility.rsaReports > 0)
    .map((facility) => ({
      facility: facility.label,
      totalReports: facility.totalReports,
      damageReports: facility.damageReports,
      rsaReports: facility.rsaReports,
    }));
  const hasSplitSeries = facilityRows.some((row) => row.damageReports > 0 || row.rsaReports > 0);
  return {
    mode: "facility",
    xKey: "facility",
    keys: hasSplitSeries ? ["damageReports", "rsaReports"] : ["totalReports"],
    data: facilityRows,
  };
}

function reportTrendSeriesLabel(key: ReportTrendKey): string {
  if (key === "damageReports") return "Damage Reports";
  if (key === "rsaReports") return "RSA Reports";
  return "Total Reports";
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

function filterHomeInspectionReports(
  reports: ReportDamageApiRow[],
  filters: ReturnType<typeof normalizeHomeReportFiltersForExport>,
  selectedSeverity: number | null,
  selectedArea: string
): ReportDamageApiRow[] {
  return reports.filter(
    (report) =>
      matchesDamageReportFilters(report, filters.homeFilters) &&
      reportMatchesSeverityFilter(report, selectedSeverity) &&
      reportMatchesDamageAreaFilter(report, selectedArea)
  );
}

function normalizeHomeReportFiltersForExport(filters: {
  selectedFacilityKey: string;
  reportIdFilter: string;
  vinFilter: string;
  inspectionTypeFilter: string;
  makeFilter: string;
  modelFilter: string;
  yardFilter: string;
  inspectorEmailFilter: string;
  statusFilter: string;
  createdFrom: string;
  createdTo: string;
}) {
  return {
    homeFilters: {
      ...DEFAULT_DAMAGE_REPORT_FILTERS,
      facilityFilter: filters.selectedFacilityKey,
      reportIdFilter: filters.reportIdFilter,
      vinFilter: filters.vinFilter,
      inspectionTypeFilter: filters.inspectionTypeFilter,
      makeFilter: filters.makeFilter,
      modelFilter: filters.modelFilter,
      yardFilter: filters.yardFilter,
      inspectorEmailFilter: filters.inspectorEmailFilter,
      statusFilter: filters.statusFilter as "" | import("@/lib/types").ReportStatus,
      createdFrom: filters.createdFrom,
      createdTo: filters.createdTo,
    },
  };
}

function ChartFooterTable({
  title,
  subtitle,
  items,
  showSeverityPills = false,
  showRowCount = true,
}: {
  title: string;
  subtitle?: string;
  items: ChartSectionGroup[];
  showSeverityPills?: boolean;
  showRowCount?: boolean;
}) {
  return (
    <div className="shrink-0 border-t border-slate-200 bg-slate-50/70">
      <div className="flex items-end justify-between gap-4 px-6 py-4">
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{title}</p>
          {subtitle ? <p className="text-xs text-slate-600">{subtitle}</p> : null}
        </div>
        {showRowCount ? (
          <span className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">{formatNumber(items.length)} rows</span>
        ) : null}
      </div>
      <div className="max-h-[260px] overflow-y-auto border-t border-slate-200">
        {items.length ? (
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-slate-50">
              <tr className="border-b border-slate-200">
                <th className="px-6 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
                  {showSeverityPills ? "Severity" : "Section"}
                </th>
                <th className="px-6 py-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500">Model</th>
                <th className="px-6 py-3 text-right text-xs font-black uppercase tracking-[0.22em] text-slate-500">Count</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {items.map((item) =>
                item.rows.map((row, rowIndex) => (
                  <tr key={`${item.section}-${row.car}`} className="align-top">
                    <td className="border-y border-l border-slate-300 px-6 py-3 text-sm font-semibold text-slate-900">
                      {showSeverityPills && row.severity ? (
                        <span
                          title={resolveSeverityLabel(row.severity)}
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${severityPillClass(row.severity)}`}
                        >
                          {SEVERITY_SHORT_LABELS[row.severity] ?? resolveSeverityLabel(row.severity)}
                        </span>
                      ) : rowIndex === 0 ? (
                        <span className="block text-xs font-black uppercase tracking-[0.18em] text-slate-500">{item.section}</span>
                      ) : null}
                    </td>
                    <td className="border-y border-slate-300 px-6 py-3">
                      <p className="truncate text-sm font-semibold text-slate-900">{row.car}</p>
                    </td>
                    <td className="border-y border-r border-slate-300 px-6 py-3 text-right text-sm font-black tracking-tight text-slate-950">{formatNumber(row.count)}</td>
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

function reportMatchesDamageAreaFilter(report: ReportDamageApiRow, areaFilter: string): boolean {
  const normalizedFilter = normalizeSearchText(areaFilter);
  if (!normalizedFilter) {
    return true;
  }
  const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  return entries.some((entry) => {
    const record = entry as unknown as Record<string, unknown>;
    const area = normalizeSearchText(
      getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"])
    );
    return area === normalizedFilter || area.includes(normalizedFilter);
  });
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

function readDamageClearBreakdown(entries: DamageBreakdownItem[] | undefined): {
  damageCount: number;
  clearCount: number;
} | null {
  if (!entries?.length) return null;

  let damageCount: number | null = null;
  let clearCount: number | null = null;
  entries.forEach((entry) => {
    const label = entry.label.trim().toLowerCase();
    if (label === "damage" || label === "damaged") damageCount = Number(entry.count);
    if (label === "clear" || label === "cleared") clearCount = Number(entry.count);
  });

  return damageCount !== null && clearCount !== null
    ? {
        damageCount: Number.isFinite(damageCount) ? damageCount : 0,
        clearCount: Number.isFinite(clearCount) ? clearCount : 0,
      }
    : null;
}

function mergeDamageClearBreakdown(
  existing: DamageBreakdownItem[] | undefined,
  damageCount: number,
  clearCount: number
): DamageBreakdownItem[] {
  const current = readDamageClearBreakdown(existing) ?? { damageCount: 0, clearCount: 0 };
  return buildDamageClearBreakdown(current.damageCount + damageCount, current.clearCount + clearCount);
}

function buildDamageClearBreakdown(damageCount: number, clearCount: number): DamageBreakdownItem[] {
  return [
    { label: "Damage", count: Number.isFinite(damageCount) ? damageCount : 0 },
    { label: "Clear", count: Number.isFinite(clearCount) ? clearCount : 0 },
  ];
}

function buildCategoryTrendExportRows(
  categoryHeader: string,
  rows: TrendRow[],
  series: string[]
): unknown[][] {
  return [
    [
      categoryHeader,
      "Damage",
      "Clear",
      "Total",
      ...rows.flatMap((row) => [
        `${String(row.date)} Damage`,
        `${String(row.date)} Clear`,
        `${String(row.date)} Total`,
      ]),
    ],
    ...series.map((name) => {
      let damaged = 0;
      let clear = 0;
      let hasDamageClearBreakdown = false;
      const dailyValues = rows.flatMap((row) => {
        const split = readDamageClearBreakdown(row.__breakdown?.[name]);
        if (split) {
          hasDamageClearBreakdown = true;
          damaged += split.damageCount;
          clear += split.clearCount;
        }
        return [
          split?.damageCount ?? "",
          split?.clearCount ?? "",
          Number(row[name] ?? 0),
        ];
      });
      const total = rows.reduce((sum, row) => sum + Number(row[name] ?? 0), 0);
      return [
        name,
        hasDamageClearBreakdown ? damaged : "",
        hasDamageClearBreakdown ? clear : "",
        total,
        ...dailyValues,
      ];
    }),
  ];
}

function formatPieExportPercentage(count: number, total: number): string {
  if (total <= 0) return "0%";
  const percentage = (count / total) * 100;
  return `${percentage < 10 ? percentage.toFixed(1) : Math.round(percentage)}%`;
}

function NonZeroBarTooltip({ active, label, payload, hideSeriesNames = false }: ChartTooltipProps & { hideSeriesNames?: boolean }) {
  if (!active || !payload?.length) {
    return null;
  }

  const visibleItems = payload
    .filter((item) => {
      const value = typeof item.value === "number" ? item.value : Number(item.value ?? 0);
      return value > 0;
    })
    .sort((left, right) => Number(right.value ?? 0) - Number(left.value ?? 0));

  if (!visibleItems.length) {
    return null;
  }

  return (
    <div className="w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-slate-300 bg-white p-4 text-[13px] shadow-[0_20px_50px_-18px_rgba(15,23,42,0.45)]">
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-slate-600">
        {formatTooltipLabel(label)}
      </p>
      <div className={visibleItems.length > 4 ? "mt-3 grid grid-cols-1 gap-2.5 lg:grid-cols-2" : "mt-3 space-y-2.5"}>
        {visibleItems.map((item) => {
          const value = typeof item.value === "number" ? item.value : Number(item.value ?? 0);
          const seriesKey = String(item.dataKey ?? item.name ?? "");
          const breakdown = seriesKey ? item.payload?.__breakdown?.[seriesKey] ?? [] : [];
          const damageClearBreakdown = readDamageClearBreakdown(breakdown);
          return (
            <div key={`${String(item.name)}-${item.dataKey ?? item.color ?? value}`} className="min-w-0 space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="h-3 w-3 shrink-0 rounded-sm border border-black/10" style={{ backgroundColor: item.color || item.fill || chartTheme.colors.text }} />
                  <span className="truncate text-sm font-bold text-slate-800">{hideSeriesNames ? "Inspection total" : String(item.name)}</span>
                </div>
                <span className="text-base font-black tabular-nums text-slate-950">{formatNumber(value)}</span>
              </div>
              {damageClearBreakdown ? (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-rose-700">Damaged</p>
                    <p className="mt-0.5 text-base font-black tabular-nums text-rose-950">
                      {formatNumber(damageClearBreakdown.damageCount)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
                    <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-teal-700">Clear</p>
                    <p className="mt-0.5 text-base font-black tabular-nums text-teal-950">
                      {formatNumber(damageClearBreakdown.clearCount)}
                    </p>
                  </div>
                </div>
              ) : breakdown.length ? (
                <div className="ml-5 space-y-1.5 border-l-2 border-slate-200 pl-3 text-xs leading-5 text-slate-600">
                  {breakdown.slice(0, 3).map((entry) => (
                    <div key={entry.label} className="flex justify-between gap-3">
                      <span className="min-w-0 truncate">{entry.label}</span>
                      <span className="font-bold tabular-nums text-slate-800">{formatNumber(entry.count)}</span>
                    </div>
                  ))}
                  {breakdown.length > 3 ? <p className="font-bold text-slate-500">+{breakdown.length - 3} more</p> : null}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PieSummaryTooltip({
  active,
  payload,
  sectionLabel,
  facilityBreakdown,
}: ChartTooltipProps & { sectionLabel: string; facilityBreakdown: PieFacilityBreakdownState }) {
  if (!active || !payload?.length) return null;

  const item = payload[0];
  const value = typeof item.value === "number" ? item.value : Number(item.value ?? 0);
  if (!Number.isFinite(value) || value <= 0) return null;

  const datum = item.payload ?? {};
  const name = String(datum.name ?? item.name ?? "Damage section");

  return (
    <div className="w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_45px_-16px_rgba(15,23,42,0.4)]">
      <div className="flex items-start justify-between gap-5">
        <div className="min-w-0 px-4 py-3">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">{sectionLabel}</p>
          <p className="mt-1 truncate text-sm font-extrabold text-slate-950">{name}</p>
        </div>
        <div data-testid="pie-tooltip-count" className="m-3 shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right text-slate-950 shadow-sm">
          <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Count</p>
          <p className="text-lg font-black tabular-nums text-slate-950">{formatNumber(value)}</p>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-slate-50/80 px-4 py-3">
        <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-500">Facility breakdown</p>
        {facilityBreakdown.status === "loading" || facilityBreakdown.status === "idle" ? (
          <p className="mt-2 text-xs font-semibold text-slate-500">Loading facility counts…</p>
        ) : facilityBreakdown.status === "error" ? (
          <p className="mt-2 text-xs font-semibold text-rose-700">Facility breakdown unavailable.</p>
        ) : facilityBreakdown.items.length ? (
          <div className="mt-2 max-h-44 space-y-1.5 overflow-y-auto pr-1">
            {facilityBreakdown.items.map((facility) => (
              <div data-testid="pie-facility-row" key={facility.label} className="flex items-center justify-between gap-4 rounded-md bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200/80">
                <span className="min-w-0 truncate text-xs font-semibold text-slate-700">{facility.label}</span>
                <span className="font-mono text-sm font-black tabular-nums text-slate-950">{formatNumber(facility.count)}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold text-slate-500">No facility counts returned for this section.</p>
        )}
      </div>
    </div>
  );
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

function buildInspectorSummaries(reports: ReportDamageApiRow[], countMode: HomeCountMode = "reports"): InspectorSummary[] {
  const grouped = new Map<string, { email: string; label: string; reportCount: number; severityCounts: Map<number, number> }>();
  for (const report of reports) {
    const email = (report.inspector_email || "unassigned").trim().toLowerCase();
    const label = report.inspector_email?.trim() || "Unassigned";
    const current = grouped.get(email) ?? { email, label, reportCount: 0, severityCounts: new Map<number, number>() };
    if (countMode === "damages") {
      const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
      current.reportCount += entries.length;
      for (const entry of entries) {
        const severity = resolveDamageSeverity(entry as unknown as Record<string, unknown>);
        if (severity !== null) {
          current.severityCounts.set(severity, (current.severityCounts.get(severity) ?? 0) + 1);
        }
      }
    } else {
      current.reportCount += 1;
      const severity = getReportSeverity(report);
      if (severity !== null) {
        current.severityCounts.set(severity, (current.severityCounts.get(severity) ?? 0) + 1);
      }
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

function readRecordNumber(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return 0;
}

function buildInspectorDailyTrendData(
  analytics: DashboardAnalyticsPayload | undefined,
  fallbackReports: ReportDamageApiRow[],
  days = 30,
  countMode: HomeCountMode = "reports",
  range?: { start: Date; end: Date },
  inspectorFilter = ""
): { data: TrendRow[]; keys: string[] } {
  const normalizedInspectorFilter = normalizeSearchText(inspectorFilter);
  const analyticsRows = ((analytics as { byInspectorDaily?: Array<Record<string, unknown>> } | undefined)?.byInspectorDaily ?? [])
    .map((row) => {
      const splitCounts = readAnalyticsSplitPair(row, countMode);
      const fallbackCount = countMode === "damages"
        ? readRecordNumber(row, ["damageEntries", "totalDamages", "entries", "reportCount", "reports", "damageReports", "count"])
        : readRecordNumber(row, ["reportCount", "reports", "totalReports", "submissions", "count", "damageReports"]);
      return {
        date: normalizeAnalyticsDateKey(row.date ?? row.day ?? row.created_date),
        label: String(row.label ?? row.email ?? "Unassigned").trim() || "Unassigned",
        splitCounts,
        reportCount: splitCounts.hasSplitData ? splitCounts.damageCount + splitCounts.clearCount : fallbackCount,
      };
    })
    .filter(
      (row) =>
        row.date &&
        row.reportCount > 0 &&
        (!normalizedInspectorFilter || normalizeSearchText(row.label) === normalizedInspectorFilter)
    );

  if (analyticsRows.length > 0) {
    const totalsByInspector = analyticsRows.reduce<Map<string, number>>((acc, row) => {
      acc.set(row.label, (acc.get(row.label) ?? 0) + row.reportCount);
      return acc;
    }, new Map());
    const keys = [...totalsByInspector.entries()]
      .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
      .map(([key]) => key);
    const dates = range
      ? Array.from({ length: daysBetween(range.start, range.end) + 1 }, (_, offset) => toDateInputValue(addDays(range.start, offset)))
      : [...new Set(analyticsRows.map((row) => row.date))].sort();
    const rows = dates.map((date) => {
      const output: TrendRow = { date };
      keys.forEach((key) => {
        output[key] = 0;
      });
      return output;
    });
    const rowsByDate = new Map(rows.map((row) => [String(row.date), row]));
    analyticsRows.forEach((row) => {
      const bucket = rowsByDate.get(row.date);
      if (bucket) {
        if (row.splitCounts.hasSplitData) {
          const breakdown = bucket.__breakdown ?? {};
          breakdown[row.label] = mergeDamageClearBreakdown(
            breakdown[row.label],
            row.splitCounts.damageCount,
            row.splitCounts.clearCount
          );
          bucket.__breakdown = breakdown;
        }
        bucket[row.label] = Number(bucket[row.label] ?? 0) + row.reportCount;
      }
    });
    return { data: rows, keys };
  }

  return buildInspectorTrendData(fallbackReports, days, range ? toDateInputValue(range.end) : undefined, countMode);
}

function normalizeInspectorSeverityItems(value: unknown, total: number): DashboardSeverityItem[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const record = item as Record<string, unknown>;
      const level = String(record.level ?? record.severity ?? record.value ?? "").trim();
      const label = String(record.label ?? (level ? resolveSeverityLabel(level) : "Severity")).trim();
      const count = Number(record.count ?? record.total ?? 0);
      if (!level || !Number.isFinite(count) || count <= 0) return null;
      const rawPercent = Number(record.percent);
      return {
        level,
        label,
        count,
        percent: Number.isFinite(rawPercent) ? rawPercent : total > 0 ? (count / total) * 100 : 0,
      } satisfies DashboardSeverityItem;
    })
    .filter((item): item is DashboardSeverityItem => Boolean(item));
}

function normalizeAnalyticsSeverityLevel(value: unknown): string {
  const numeric = getSeverityNumber(value);
  if (numeric) return String(numeric);
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "low") return "1";
  if (normalized === "medium") return "3";
  if (normalized === "high") return "5";
  return String(value ?? "").trim();
}

function normalizeDashboardSeverityItems(
  analytics: DashboardAnalyticsPayload | undefined,
  countMode: HomeCountMode
): DashboardSeverityItem[] {
  const rows = Array.isArray(analytics?.severity) ? analytics.severity : [];
  const normalizedRows = rows
    .map((item) => {
      const record = item as Record<string, unknown>;
      const level = normalizeAnalyticsSeverityLevel(record.level ?? record.severity ?? record.value);
      const count = countMode === "damages"
        ? readRecordNumber(record, ["entries", "damageEntries", "totalDamages", "count"])
        : readRecordNumber(record, ["count", "reportCount", "reports"]);
      if (!level || count <= 0) return null;
      const label = String(record.label ?? resolveSeverityLabel(level)).trim() || resolveSeverityLabel(level);
      const rawPercent = Number(record.percent);
      return {
        level,
        label,
        count,
        percent: Number.isFinite(rawPercent) ? rawPercent : 0,
      } satisfies DashboardSeverityItem;
    })
    .filter((item): item is DashboardSeverityItem => Boolean(item));

  if (normalizedRows.length) {
    const total = normalizedRows.reduce((sum, item) => sum + item.count, 0);
    return normalizedRows.map((item) => ({
      ...item,
      percent: item.percent || (total > 0 ? (item.count / total) * 100 : 0),
    }));
  }

  const groups = analytics?.severityGroups;
  if (!groups) return [];
  const fallbackRows = [
    { level: "1", label: "Low", count: Number(groups.low ?? 0) },
    { level: "3", label: "Medium", count: Number(groups.medium ?? 0) },
    { level: "5", label: "High", count: Number(groups.high ?? 0) },
  ].filter((item) => Number.isFinite(item.count) && item.count > 0);
  const total = fallbackRows.reduce((sum, item) => sum + item.count, 0);
  return fallbackRows.map((item) => ({
    ...item,
    percent: total > 0 ? (item.count / total) * 100 : 0,
  }));
}

function normalizeAnalyticsTopBuckets(items: unknown): { name: string; count: number }[] {
  if (!Array.isArray(items)) return [];
  return items
    .map((item) => {
      const record = item as Record<string, unknown>;
      const name = readAnalyticsString(record, ["name", "label", "area", "type"], "");
      const count = readAnalyticsNumber(record, ["count", "reports", "entries", "total"]);
      return name && count > 0 ? { name, count } : null;
    })
    .filter((item): item is { name: string; count: number } => Boolean(item))
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

function buildAnalyticsInspectorSummaries(
  analytics: DashboardAnalyticsPayload | undefined,
  countMode: HomeCountMode
): InspectorSummary[] {
  return (analytics?.byInspector ?? [])
    .flatMap((item) => {
      const record = item as Record<string, unknown>;
      const email = String(record.email ?? record.inspector_email ?? "").trim();
      const label = String(record.label ?? record.name ?? email ?? "Unassigned").trim() || "Unassigned";
      const splitCounts = readAnalyticsSplitPair(record, countMode);
      const fallbackCount = countMode === "damages"
        ? readRecordNumber(record, ["damageEntries", "totalDamages", "entries", "reportCount"])
        : readRecordNumber(record, ["reportCount", "reports", "totalReports", "submissions", "count", "damageReports"]);
      const reportCount = splitCounts.hasSplitData ? splitCounts.damageCount + splitCounts.clearCount : fallbackCount;
      if (!email && reportCount <= 0) return [];
      return [
        {
          email: email || label.toLowerCase(),
          label,
          reportCount,
          damageCount: splitCounts.hasSplitData ? splitCounts.damageCount : undefined,
          clearCount: splitCounts.hasSplitData ? splitCounts.clearCount : undefined,
          hasClearDamageSplit: splitCounts.hasSplitData,
          severity: normalizeInspectorSeverityItems(record.severity, reportCount),
        } satisfies InspectorSummary,
      ];
    })
    .sort((left, right) => right.reportCount - left.reportCount || left.label.localeCompare(right.label));
}

function normalizeAnalyticsDateKey(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  return value.trim().slice(0, 10);
}

function buildDailyAnalyticsTrend(
  analytics: DashboardAnalyticsPayload | undefined,
  range: { start: Date; end: Date },
  countMode: HomeCountMode
): { source: string; rows: TrendRow[]; keys: string[] } {
  const dayCount = daysBetween(range.start, range.end) + 1;
  const rows = new Map<string, TrendRow>();
  for (let offset = 0; offset < dayCount; offset += 1) {
    const date = addDays(range.start, offset);
    rows.set(toDateInputValue(date), { date: toDateInputValue(date) });
  }

  const facilityDailyRows = [
    ...(((analytics as { byFacilityDaily?: Array<Record<string, unknown>> } | undefined)?.byFacilityDaily ?? [])),
    ...(((analytics as { facilityDaily?: Array<Record<string, unknown>> } | undefined)?.facilityDaily ?? [])),
  ];
  const facilityKeys = new Set<string>();

  for (const item of facilityDailyRows) {
    const date = normalizeAnalyticsDateKey(item.date ?? item.day ?? item.created_date);
    const row = rows.get(date);
    if (!row) continue;
    const facility = resolveHomeFacilityLabel(
      readAnalyticsString(item, ["label", "facility", "name", "navigation", "location_label", "location_name"], "Other")
    );
    const splitCounts = readAnalyticsSplitPair(item, countMode);
    const value = splitCounts.hasSplitData
      ? splitCounts.damageCount + splitCounts.clearCount
      : countMode === "damages"
        ? readAnalyticsNumber(item, ["entries", "damageEntries", "totalDamages"])
        : readAnalyticsNumber(item, ["totalReports", "reportCount", "reports", "submissions", "count", "damageReports"]);
    if (value <= 0) continue;
    if (splitCounts.hasSplitData) {
      const breakdown = row.__breakdown ?? {};
      breakdown[facility] = mergeDamageClearBreakdown(
        breakdown[facility],
        splitCounts.damageCount,
        splitCounts.clearCount
      );
      row.__breakdown = breakdown;
    }
    facilityKeys.add(facility);
    row[facility] = Number(row[facility] ?? 0) + value;
  }

  if (facilityKeys.size) {
    const keys = [...facilityKeys].sort((left, right) => left.localeCompare(right));
    return {
      source: "/api/dashboard/analytics byFacilityDaily",
      rows: [...rows.values()].map((row) => {
        keys.forEach((key) => {
          row[key] = Number(row[key] ?? 0);
        });
        return row;
      }),
      keys,
    };
  }

  const dailyRows = analytics?.dailyTrend ?? [];
  const keys = [INSPECTION_SUBMISSIONS_SERIES];
  for (const item of dailyRows) {
    const date = normalizeAnalyticsDateKey(item.date);
    const row = rows.get(date);
    if (!row) continue;
    const splitCounts = readAnalyticsSplitPair(item as Record<string, unknown>, countMode);
    const submissionCount = splitCounts.hasSplitData
      ? splitCounts.damageCount + splitCounts.clearCount
      : readAnalyticsNumber(item as unknown as Record<string, unknown>, ["totalReports", "reportCount", "reports", "submissions", "count", "damageReports"]);
    row[INSPECTION_SUBMISSIONS_SERIES] = submissionCount;
    if (splitCounts.hasSplitData) {
      const breakdown = row.__breakdown ?? {};
      breakdown[INSPECTION_SUBMISSIONS_SERIES] = buildDamageClearBreakdown(
        splitCounts.damageCount,
        splitCounts.clearCount
      );
      row.__breakdown = breakdown;
    }
  }

  return {
    source: "/api/dashboard/analytics dailyTrend",
    rows: [...rows.values()].map((row) => {
      keys.forEach((key) => {
        row[key] = Number(row[key] ?? 0);
      });
      return row;
    }),
    keys,
  };
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
  endDate?: string,
  countMode: HomeCountMode = "reports"
): { data: TrendRow[]; keys: string[] } {
  const now = endDate ? new Date(endDate) : new Date();
  const start = addDays(now, -(days - 1));
  const submitters = [...new Set(reports.map((report) => normalizeLabel(report.inspector_email || "Unassigned")))].sort((a, b) =>
    a.localeCompare(b)
  );
  const dateRows = new Map<string, TrendRow>();

  for (let offset = 0; offset < days; offset += 1) {
    const date = addDays(start, offset);
    const key = toDateInputValue(date);
    const row: TrendRow = { date: key };
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
    const damageEntryCount = getDamageEntryCount(report);
    const increment = countMode === "damages" ? damageEntryCount : damageEntryCount > 0 ? 1 : 0;
    if (increment <= 0) continue;
    bucket[submitter] = Number(bucket[submitter] ?? 0) + increment;
    addDamageBreakdown(bucket, submitter, report);
  }

  return { data: [...dateRows.values()], keys: submitters };
}

function getReportFacilityLabel(report: ReportDamageApiRow): string {
  return resolveHomeFacilityLabel(resolveDamageReportLocationName(report));
}

function getReportYardLabel(report: ReportDamageApiRow): string {
  const record = report as unknown as Record<string, unknown>;
  const payload = asPlainRecord(record.payload);
  const nestedReport = asPlainRecord(record.report);
  const raw = asPlainRecord(record.raw);
  const metadata = asPlainRecord(record.metadata);
  const payloadMetadata = asPlainRecord(payload?.metadata);
  const nestedReportMetadata = asPlainRecord(nestedReport?.metadata);
  const rawMetadata = asPlainRecord(raw?.metadata);
  const locationRecords = [
    asPlainRecord(record.location),
    asPlainRecord(payload?.location),
    asPlainRecord(nestedReport?.location),
    asPlainRecord(raw?.location),
    asPlainRecord(metadata?.location),
    asPlainRecord(payloadMetadata?.location),
    asPlainRecord(nestedReportMetadata?.location),
    asPlainRecord(rawMetadata?.location),
  ];
  return firstDisplayString(
    record.yard,
    record.yardName,
    record.yard_name,
    record.yardLabel,
    record.yard_label,
    metadata?.yard,
    metadata?.yardName,
    metadata?.yard_name,
    metadata?.yardLabel,
    metadata?.yard_label,
    payload?.yard,
    payload?.yardName,
    payload?.yard_name,
    payloadMetadata?.yard,
    payloadMetadata?.yardName,
    payloadMetadata?.yard_name,
    nestedReport?.yard,
    nestedReport?.yardName,
    nestedReport?.yard_name,
    nestedReportMetadata?.yard,
    nestedReportMetadata?.yardName,
    nestedReportMetadata?.yard_name,
    raw?.yard,
    raw?.yardName,
    raw?.yard_name,
    rawMetadata?.yard,
    rawMetadata?.yardName,
    rawMetadata?.yard_name,
    ...locationRecords.flatMap((location) =>
      location ? [location.yard, location.yardName, location.yard_name, location.yardLabel, location.yard_label] : []
    )
  );
}

function countToRows(counts: Map<string, number>, limit = 20): Array<{ label: string; count: number }> {
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label))
    .slice(0, limit);
}

function addCount(counts: Map<string, number>, label: string, amount = 1): void {
  const normalized = normalizeFacilityDisplayLabel(label);
  counts.set(normalized, (counts.get(normalized) ?? 0) + amount);
}

function compactLocationDebugFields(record: unknown): Record<string, unknown> {
  const source = asPlainRecord(record) ?? {};
  const location = asPlainRecord(source.location);
  const payload = asPlainRecord(source.payload);
  const payloadLocation = asPlainRecord(payload?.location);
  const nestedReport = asPlainRecord(source.report);
  const nestedReportLocation = asPlainRecord(nestedReport?.location);
  return {
    facility: source.facility ?? null,
    facilityName: source.facilityName ?? source.facility_name ?? null,
    facilityId: source.facilityId ?? source.facility_id ?? null,
    locationLabel: source.locationLabel ?? source.location_label ?? null,
    locationName: source.locationName ?? source.location_name ?? null,
    locationId: source.locationId ?? source.location_id ?? null,
    navigation: source.navigation ?? null,
    location,
    payloadFacility: payload?.facility ?? payload?.facilityName ?? payload?.facility_name ?? null,
    payloadLocation,
    reportFacility: nestedReport?.facility ?? nestedReport?.facilityName ?? nestedReport?.facility_name ?? null,
    reportLocation: nestedReportLocation,
  };
}

function compactDamageReportDebug(report: ReportDamageApiRow): Record<string, unknown> {
  return {
    reportId: report.report_id,
    vin: report.vin ?? null,
    createdAt: report.created_at ?? null,
    updatedAt: report.updated_at ?? null,
    inspectorEmail: report.inspector_email ?? null,
    resolvedFacility: getReportFacilityLabel(report),
    status: report.status ?? null,
    inspectionType: report.inspection_type_number ?? null,
    damageEntryCount: Array.isArray(report.damage_entries) ? report.damage_entries.length : 0,
    locationFields: compactLocationDebugFields(report),
  };
}

function buildDamageReportsDebugOverview(reports: ReportDamageApiRow[]) {
  const todayKey = toDateInputValue(new Date());
  const facilityCounts = new Map<string, number>();
  const todayFacilityCounts = new Map<string, number>();
  const severityCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  const dates: string[] = [];
  const otherReports: ReportDamageApiRow[] = [];

  for (const report of reports) {
    const facility = getReportFacilityLabel(report);
    addCount(facilityCounts, facility);
    if (facility === "Other") {
      otherReports.push(report);
    }
    const reportDate = getReportDate(report);
    if (reportDate) {
      const dateKey = toDateInputValue(reportDate);
      dates.push(dateKey);
      if (dateKey === todayKey) {
        addCount(todayFacilityCounts, facility);
      }
    }

    const severity = getReportSeverity(report);
    if (severity) {
      const label = resolveSeverityLabel(severity);
      severityCounts.set(label, (severityCounts.get(label) ?? 0) + 1);
    }

    const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
    const reportAreas = new Set<string>();
    const reportTypes = new Set<string>();
    for (const entry of entries) {
      const record = entry as unknown as Record<string, unknown>;
      const area = normalizeLabel(
        getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"])
      );
      const type = normalizeLabel(
        getDamageEntryField(record, ["damage_type", "damage_type_code", "damage_type_name", "type", "type_code"])
      );
      if (area !== "Unavailable") reportAreas.add(area);
      if (type !== "Unavailable") reportTypes.add(type);
    }
    reportAreas.forEach((area) => areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1));
    reportTypes.forEach((type) => typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1));
  }

  const sortedDates = dates.sort();
  return {
    reportCount: reports.length,
    todayReportCount: reports.filter((report) => {
      const reportDate = getReportDate(report);
      return reportDate ? toDateInputValue(reportDate) === todayKey : false;
    }).length,
    dateRange: {
      min: sortedDates[0] ?? null,
      max: sortedDates[sortedDates.length - 1] ?? null,
    },
    facilityCounts: countToRows(facilityCounts),
    todayFacilityCounts: countToRows(todayFacilityCounts),
    severityCounts: countToRows(severityCounts),
    topDamageAreas: countToRows(areaCounts),
    topDamageTypes: countToRows(typeCounts),
    otherReportCount: otherReports.length,
    otherSamples: otherReports.slice(0, 10).map(compactDamageReportDebug),
  };
}

function readRsaRailcarNumbers(report: RsaReportApiRow): string[] {
  const reportRecord = report as unknown as Record<string, unknown>;
  const payload = asPlainRecord(report.payload);
  const nestedReport = asPlainRecord(report.report);
  const railcarScan = asPlainRecord(report.railcar_scan);
  const cars = Array.isArray(report.cars) ? report.cars : [];
  const values = [
    report.rail_car_number,
    reportRecord.railcarNumber,
    reportRecord.railcar_number,
    payload?.rail_car_number,
    payload?.railcarNumber,
    nestedReport?.rail_car_number,
    nestedReport?.railcarNumber,
    railcarScan?.rail_car_number,
    railcarScan?.railcarNumber,
    ...cars.flatMap((car) => {
      const record = asPlainRecord(car) ?? {};
      return [record.rail_car_number, record.railcarNumber, record.railcar_number, record.car_number, record.carNumber];
    }),
  ];
  return Array.from(new Set(values.map(readDisplayString).filter(Boolean)));
}

function readRsaTrackSpotLabel(report: RsaReportApiRow): string {
  const reportRecord = report as unknown as Record<string, unknown>;
  const payload = asPlainRecord(report.payload);
  const nestedReport = asPlainRecord(report.report);
  const railcarScan = asPlainRecord(report.railcar_scan);
  const track = firstDisplayString(report.track, reportRecord.track, payload?.track, nestedReport?.track, railcarScan?.track);
  const spot = firstDisplayString(report.spot, reportRecord.spot, payload?.spot, nestedReport?.spot, railcarScan?.spot);
  if (track && spot) return `Track ${track} / Spot ${spot}`;
  if (track) return `Track ${track}`;
  if (spot) return `Spot ${spot}`;
  return "Uncategorized";
}

function compactRsaReportDebug(report: RsaReportApiRow): Record<string, unknown> {
  return {
    reportId: report.report_id,
    createdAt: report.created_at ?? null,
    updatedAt: report.updated_at ?? null,
    inspectorEmail: report.inspector_email ?? null,
    resolvedFacility: normalizeFacilityDisplayLabel(resolveRsaFacilityLabel(report)),
    trackSpot: readRsaTrackSpotLabel(report),
    railcars: readRsaRailcarNumbers(report),
    locationFields: compactLocationDebugFields(report),
  };
}

function buildRsaReportsDebugOverview(reports: RsaReportApiRow[]) {
  const facilityCounts = new Map<string, number>();
  const trackSpotCounts = new Map<string, number>();
  const railcars = new Set<string>();
  const uncategorizedReports: RsaReportApiRow[] = [];

  for (const report of reports) {
    addCount(facilityCounts, normalizeFacilityDisplayLabel(resolveRsaFacilityLabel(report)));
    const trackSpot = readRsaTrackSpotLabel(report);
    trackSpotCounts.set(trackSpot, (trackSpotCounts.get(trackSpot) ?? 0) + 1);
    if (trackSpot === "Uncategorized") {
      uncategorizedReports.push(report);
    }
    readRsaRailcarNumbers(report).forEach((railcar) => railcars.add(railcar));
  }

  return {
    reportCount: reports.length,
    railcarCount: railcars.size,
    facilityCounts: countToRows(facilityCounts),
    trackSpotCounts: countToRows(trackSpotCounts),
    uncategorizedTrackSpotCount: uncategorizedReports.length,
    uncategorizedSamples: uncategorizedReports.slice(0, 10).map(compactRsaReportDebug),
  };
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
      exportLabel("Yard"),
      exportLabel("Entries Count"),
      exportLabel("Comments"),
      exportLabel("Created At"),
      exportLabel("Updated At"),
      exportLabel("Overview Comments"),
      exportLabel("Bay Location"),
      exportLabel("Navigation"),
      exportLabel("Damage Details"),
    ],
    ...reports.map((report) => {
      const facility = exportLabel(getReportFacilityLabel(report));
      const yard = exportLabel(getReportYardLabel(report));
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
        yard,
        getDamageEntryCount(report),
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

function formatReportDamageAreas(report: ReportDamageApiRow): string {
  const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  return Array.from(
    new Set(
      entries
        .map((entry) => {
          const record = entry as unknown as Record<string, unknown>;
          return normalizeLabel(getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"]));
        })
        .filter((area) => area && area !== "Unavailable")
    )
  ).join(" | ");
}

function buildInspectionVinSheetRows(reports: ReportDamageApiRow[]): unknown[][] {
  return [
    [
      "Report ID",
      "VIN",
      "Inspection Outcome",
      "Entries Count",
      "Severity",
      "Damage Areas",
      "Facility",
      "Yard",
      "Inspector Email",
      "Inspection Type",
      "Make",
      "Model",
      "Year",
      "Created At",
      "Updated At",
      "PDF URL",
      "Damage Details",
    ],
    ...reports.map((report) => {
      const severity = getReportSeverity(report);
      return [
        report.report_id,
        report.vin || "",
        getReportOutcomeLabel(report),
        getDamageEntryCount(report),
        severity ? `${severity} - ${resolveSeverityLabel(severity)}` : "",
        formatReportDamageAreas(report),
        getReportFacilityLabel(report),
        getReportYardLabel(report),
        report.inspector_email || "",
        getReportInspectionTypeDisplay(report),
        report.make || "",
        report.model || "",
        report.year ?? "",
        report.created_at || "",
        report.updated_at || "",
        report.pdf_url || "",
        formatDamageEntries(report.damage_entries),
      ];
    }),
  ];
}

function urlStringsFromValue(value: unknown): string[] {
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  if (Array.isArray(value)) {
    return value.flatMap(urlStringsFromValue);
  }
  const record = asPlainRecord(value);
  if (!record) return [];
  return [
    record.url,
    record.uri,
    record.href,
    record.signedUrl,
    record.signed_url,
    record.path,
  ].flatMap(urlStringsFromValue);
}

function getReportPhotoUrls(report: ReportDamageApiRow): string[] {
  const record = report as unknown as Record<string, unknown>;
  return Array.from(new Set([
    ...urlStringsFromValue(report.photo_urls),
    ...urlStringsFromValue(record.photoUrls),
    ...urlStringsFromValue(record.photos),
  ]));
}

function getReportSplatUrls(report: ReportDamageApiRow): string[] {
  const record = report as unknown as Record<string, unknown>;
  return Array.from(new Set([
    ...urlStringsFromValue(report.splat_urls),
    ...urlStringsFromValue(record.splatUrls),
    ...urlStringsFromValue(record.splat_urls_original),
    ...urlStringsFromValue(record.splatImageUrl),
  ]));
}

function buildDamageEntriesSheetRows(reports: ReportDamageApiRow[]): unknown[][] {
  return [
    [
      "Report ID",
      "VIN",
      "Facility",
      "Yard",
      "Inspector Email",
      "Inspection Type",
      "Entry Number",
      "Damage Area",
      "Damage Type",
      "Severity",
      "Comments",
      "Photo URLs",
      "Raw Entry JSON",
    ],
    ...reports.flatMap((report) => {
      const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
      return entries.map((entry, index) => {
        const record = entry as unknown as Record<string, unknown>;
        return [
          report.report_id,
          report.vin || "",
          getReportFacilityLabel(report),
          getReportYardLabel(report),
          report.inspector_email || "",
          getReportInspectionTypeDisplay(report),
          index + 1,
          getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"]),
          getDamageEntryField(record, ["damage_type", "damage_type_code", "damage_type_name", "type", "type_code"]),
          record.severity ?? record.severity_level ?? record.severityLevel ?? "",
          getDamageEntryField(record, ["comments", "comment", "notes", "description"]),
          urlStringsFromValue([record.photoUrls, record.photo_urls, record.photos, record.media]).join(" | "),
          JSON.stringify(record),
        ];
      });
    }),
  ];
}

function buildMediaLinksSheetRows(reports: ReportDamageApiRow[]): unknown[][] {
  return [
    ["Report ID", "VIN", "Facility", "Yard", "PDF URL", "Photo URLs", "Splat URLs"],
    ...reports.map((report) => [
      report.report_id,
      report.vin || "",
      getReportFacilityLabel(report),
      getReportYardLabel(report),
      report.pdf_url || "",
      getReportPhotoUrls(report).join(" | "),
      getReportSplatUrls(report).join(" | "),
    ]),
  ];
}

function buildSubmissionDetailRows(report: ReportDamageApiRow): unknown[][] {
  const severity = getReportSeverity(report);
  return [
    ["Field", "Value"],
    ["Report ID", report.report_id],
    ["VIN", report.vin || ""],
    ["Inspection Outcome", getReportOutcomeLabel(report)],
    ["Entries Count", getDamageEntryCount(report)],
    ["Severity", severity ? `${severity} - ${resolveSeverityLabel(severity)}` : ""],
    ["Damage Areas", formatReportDamageAreas(report)],
    ["Facility", getReportFacilityLabel(report)],
    ["Yard", getReportYardLabel(report)],
    ["Inspector Email", report.inspector_email || ""],
    ["Inspection Type", getReportInspectionTypeDisplay(report)],
    ["Make", report.make || ""],
    ["Model", report.model || ""],
    ["Year", report.year ?? ""],
    ["Status", report.status || ""],
    ["Created At", report.created_at || ""],
    ["Updated At", report.updated_at || ""],
    ["Comments", report.comments || ""],
    ["Overview Comments", getOverviewField(report, "comments")],
    ["Bay Location", getOverviewField(report, "bay_location")],
    ["Navigation", getOverviewField(report, "navigation") || getOverviewField(report, "navigation_text") || getOverviewField(report, "navigationText")],
    ["PDF URL", report.pdf_url || ""],
    ["Photo URLs", getReportPhotoUrls(report).join(" | ")],
    ["Splat URLs", getReportSplatUrls(report).join(" | ")],
    ["Damage Details", formatDamageEntries(report.damage_entries)],
  ];
}

function buildDashboardSummary(
  damageReports: ReportDamageApiRow[],
  rsaReports: RsaReportApiRow[],
  facilities: FacilityDamageStats[],
  countMode: HomeCountMode = "reports"
): DashboardSummary {
  const todayKey = toDateInputValue(new Date());
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const severityTotals = groupSeverityCounts(damageReports, countMode);
  const totalDamageEntries = countDamageEntries(damageReports);
  const totalVins = new Set(damageReports.map((report) => (report.vin ?? "").trim().toUpperCase()).filter(Boolean)).size;

  const areaCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  for (const report of damageReports) {
    const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
    const reportAreas = new Set<string>();
    const reportTypes = new Set<string>();
    for (const entry of entries) {
      const record = entry as unknown as Record<string, unknown>;
      const area = normalizeLabel(
        getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"])
      );
      const type = normalizeLabel(
        getDamageEntryField(record, ["damage_type", "damage_type_code", "damage_type_name", "type", "type_code"])
      );
      if (countMode === "damages") {
        if (area !== "Unavailable") areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
        if (type !== "Unavailable") typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1);
      } else {
        if (area !== "Unavailable") reportAreas.add(area);
        if (type !== "Unavailable") reportTypes.add(type);
      }
    }
    if (countMode === "reports") {
      reportAreas.forEach((area) => areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1));
      reportTypes.forEach((type) => typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1));
    }
  }

  const dailyTrend = buildTrendData(damageReports, rsaReports, 30);
  const severityItems = buildSeverityItemsFromCounts(
    severityTotals.counts,
    countMode === "damages" ? totalDamageEntries : damageReports.length
  );
  const damageTodayTotal = damageReports.filter((report) => {
    const date = getReportDate(report);
    return date ? toDateInputValue(date) === todayKey : false;
  }).length;
  const damageEntriesTodayTotal = countDamageEntries(
    damageReports.filter((report) => {
      const date = getReportDate(report);
      return date ? toDateInputValue(date) === todayKey : false;
    })
  );
  const rsaTodayTotal = rsaReports.filter((report) => {
    const date = getReportDate(report);
    return date ? toDateInputValue(date) === todayKey : false;
  }).length;
  const damageLast7DaysTotal = damageReports.filter((report) => {
    const date = getReportDate(report);
    return date ? date >= weekAgo : false;
  }).length;
  const rsaLast7DaysTotal = rsaReports.filter((report) => {
    const date = getReportDate(report);
    return date ? date >= weekAgo : false;
  }).length;
  const damageMonthToDateTotal = damageReports.filter((report) => {
    const date = getReportDate(report);
    return date ? date >= monthStart : false;
  }).length;
  const damageEntriesMonthToDateTotal = countDamageEntries(
    damageReports.filter((report) => {
      const date = getReportDate(report);
      return date ? date >= monthStart : false;
    })
  );
  const damageYearToDateTotal = damageReports.filter((report) => {
    const date = getReportDate(report);
    return date ? date >= yearStart : false;
  }).length;
  const damageEntriesYearToDateTotal = countDamageEntries(
    damageReports.filter((report) => {
      const date = getReportDate(report);
      return date ? date >= yearStart : false;
    })
  );

  const facilitySummaries = facilities.map((facility) => {
    const areaCountsForFacility = new Map<string, number>();
    const typeCountsForFacility = new Map<string, number>();
    const relatedReports = damageReports.filter(
      (report) => getReportFacilityLabel(report).toLowerCase() === normalizeFacilityDisplayLabel(facility.label).toLowerCase()
    );
    let highSeverityCount = 0;
    let relatedEntryCount = 0;
    for (const report of relatedReports) {
      const reportEntries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
      relatedEntryCount += reportEntries.length;
      const severity = getReportSeverity(report);
      if (severity !== null && severity >= 5) {
        highSeverityCount += 1;
      }
      const reportAreas = new Set<string>();
      const reportTypes = new Set<string>();
      for (const entry of reportEntries) {
        const record = entry as unknown as Record<string, unknown>;
        const area = normalizeLabel(
          getDamageEntryField(record, ["damage_area", "damage_area_code", "damage_area_name", "area", "area_code"])
        );
        const type = normalizeLabel(
          getDamageEntryField(record, ["damage_type", "damage_type_code", "damage_type_name", "type", "type_code"])
        );
        if (area !== "Unavailable") reportAreas.add(area);
        if (type !== "Unavailable") reportTypes.add(type);
      }
      reportAreas.forEach((area) => areaCountsForFacility.set(area, (areaCountsForFacility.get(area) ?? 0) + 1));
      reportTypes.forEach((type) => typeCountsForFacility.set(type, (typeCountsForFacility.get(type) ?? 0) + 1));
    }

    const relatedRsaReports = rsaReports.filter((report) => {
      const label = normalizeLabel(report.facility || report.track || report.spot).toLowerCase();
      return label === facility.label.toLowerCase();
    });

    const severityMap = new Map<number, number>();
    for (const report of relatedReports) {
      if (countMode === "damages") {
        const reportEntries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
        for (const entry of reportEntries) {
          const severity = resolveDamageSeverity(entry as unknown as Record<string, unknown>);
          if (severity) severityMap.set(severity, (severityMap.get(severity) ?? 0) + 1);
        }
      } else {
        const severity = getReportSeverity(report);
        if (severity) severityMap.set(severity, (severityMap.get(severity) ?? 0) + 1);
      }
    }
    const severity = buildSeverityItemsFromCounts(severityMap, countMode === "damages" ? relatedEntryCount : relatedReports.length);
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
      entries: countMode === "damages" ? relatedEntryCount : relatedReports.length,
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
      totalReports: damageReports.length + rsaReports.length,
      damageReports: damageReports.length,
      noDamageReports: 0,
      twentyFourHourReports: 0,
      inspection02Reports: 0,
      rsaReports: rsaReports.length,
      facilities: facilities.length,
      vins: totalVins,
      entries: countMode === "damages" ? totalDamageEntries : damageReports.length,
    },
    currentPeriod: {
      damageToday: countMode === "damages" ? damageEntriesTodayTotal : damageTodayTotal,
      clearToday: 0,
      rsaToday: rsaTodayTotal,
      reportsToday: damageTodayTotal + rsaTodayTotal,
      damageLast7Days: damageLast7DaysTotal,
      rsaLast7Days: rsaLast7DaysTotal,
      reportsLast7Days: damageLast7DaysTotal + rsaLast7DaysTotal,
      reportsThisWeek: damageLast7DaysTotal + rsaLast7DaysTotal,
      damageMonthToDate: countMode === "damages" ? damageEntriesMonthToDateTotal : damageMonthToDateTotal,
      damageYearToDate: countMode === "damages" ? damageEntriesYearToDateTotal : damageYearToDateTotal,
      reportsThisMonth: damageMonthToDateTotal,
      reportsThisYear: damageYearToDateTotal,
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

function HomeLoadingShell({ message = "Loading analytics..." }: { message?: string }) {
  return (
    <PageLoadingScreen
      title="Loading home analytics"
      description={message}
      detail="Preparing filters, totals, and chart data."
    />
  );
}

function AnalyticsStatusBanner({
  refreshing,
  errorMessage,
}: {
  refreshing: boolean;
  errorMessage: string | null;
}) {
  if (!refreshing && !errorMessage) {
    return null;
  }
  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm font-medium ${
        errorMessage
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-sky-200 bg-sky-50 text-sky-900"
      }`}
    >
      {errorMessage
        ? `Showing cached analytics. Refresh failed: ${errorMessage}`
        : "Refreshing analytics in the background."}
    </div>
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
        actions={<span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{formatNumber(facility.damageReports)} reports</span>}
      />
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Today</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(facility.today)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Last 7 Days</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(facility.last7Days)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Month to Date</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(facility.monthToDate)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Year to Date</p>
            <p className="mt-1 text-xl font-black text-slate-950">{formatNumber(facility.yearToDate)}</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Severity</p>
            <div className="mt-3 space-y-2">
              {facility.severity.map((item) => (
                <div key={`${facility.id}-${item.level}`} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-700">{item.level}</span>
                    <span className="text-xs font-semibold text-slate-500">{formatNumber(item.count)}</span>
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
              <span className="text-slate-500">Reports</span>
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

export default function HomeDashboard() {
  const {
    organizationId,
    session,
    status: sessionStatus,
    organizationScopes,
    selectedOrganizationScopeKey,
    selectedOrganizationScope,
    switchOrganizationScope,
  } = usePortalSession();
  const { data: directory, isLoading, error } = usePortalDirectorySnapshot();
  const [initialHomeAnalyticsFilters] = useState<HomeAnalyticsFilters>(() =>
    typeof window === "undefined"
      ? getDefaultHomeAnalyticsFilters()
      : parseHomeAnalyticsFilters(new URLSearchParams(window.location.search))
  );
  const [devStatsCopyStatus, setDevStatsCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [showDevStatsCopyButton, setShowDevStatsCopyButton] = useState(process.env.NODE_ENV !== "production");
  const [selectedFacilityKey, setSelectedFacilityKey] = useState(initialHomeAnalyticsFilters.facilityKey);
  const [selectedSeverityLevel, setSelectedSeverityLevel] = useState(
    normalizeSeverityFilterValue(initialHomeAnalyticsFilters.severity)
  );
  const [selectedDamageAreaFilter, setSelectedDamageAreaFilter] = useState(initialHomeAnalyticsFilters.damageArea ?? "");
  const [createdFrom, setCreatedFrom] = useState(initialHomeAnalyticsFilters.from ?? "");
  const [createdTo, setCreatedTo] = useState(initialHomeAnalyticsFilters.to ?? "");
  const [reportIdFilter, setReportIdFilter] = useState(initialHomeAnalyticsFilters.reportId ?? "");
  const [vinFilter, setVinFilter] = useState(initialHomeAnalyticsFilters.vin ?? "");
  const [inspectionTypeFilter, setInspectionTypeFilter] = useState(initialHomeAnalyticsFilters.inspectionType ?? "");
  const [makeFilter, setMakeFilter] = useState(initialHomeAnalyticsFilters.make ?? "");
  const [modelFilter, setModelFilter] = useState(initialHomeAnalyticsFilters.model ?? "");
  const [yardFilter, setYardFilter] = useState(initialHomeAnalyticsFilters.yard ?? "");
  const [inspectorEmailFilter, setInspectorEmailFilter] = useState(initialHomeAnalyticsFilters.inspectorKey);
  const [statusFilter, setStatusFilter] = useState(initialHomeAnalyticsFilters.status ?? "");
  const homeCountMode: HomeCountMode = initialHomeAnalyticsFilters.countMode;
  const [homeFilterMenuOpen, setHomeFilterMenuOpen] = useState(false);
  const [hoveredSeverityIndex, setHoveredSeverityIndex] = useState<number | null>(null);
  const [hoveredAreaIndex, setHoveredAreaIndex] = useState<number | null>(null);
  const [severityFacilityBreakdown, setSeverityFacilityBreakdown] = useState<PieFacilityBreakdownState>({
    key: "",
    status: "idle",
    items: [],
  });
  const [areaFacilityBreakdown, setAreaFacilityBreakdown] = useState<PieFacilityBreakdownState>({
    key: "",
    status: "idle",
    items: [],
  });
  const pieFacilityBreakdownCacheRef = useRef(new Map<string, PieBreakdownItem[]>());
  const didApplyInitialHomeFiltersRef = useRef(false);
  const [isApplyingHomeFilters, setIsApplyingHomeFilters] = useState(false);
  const [activeHomeFilterKeys, setActiveHomeFilterKeys] = useState<HomeFilterKey[]>(() =>
    getHomeFilterKeysWithValues(initialHomeAnalyticsFilters)
  );
  const didMountOrganizationResetRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLocalDebugHost(window.location.hostname)) {
      setShowDevStatsCopyButton(true);
    }
  }, []);

  const currentHomeAnalyticsFilters = useMemo<HomeAnalyticsFilters>(
    () => ({
      from: createdFrom || undefined,
      to: createdTo || undefined,
      facilityKey: selectedFacilityKey,
      inspectorKey: inspectorEmailFilter,
      status: statusFilter || undefined,
      countMode: homeCountMode,
      reportId: reportIdFilter || undefined,
      vin: vinFilter || undefined,
      inspectionType: inspectionTypeFilter || undefined,
      make: makeFilter || undefined,
      model: modelFilter || undefined,
      yard: yardFilter || undefined,
      severity: normalizeSeverityFilterValue(selectedSeverityLevel) !== "all"
        ? normalizeSeverityFilterValue(selectedSeverityLevel)
        : undefined,
      damageArea: selectedDamageAreaFilter || undefined,
    }),
    [createdFrom, createdTo, homeCountMode, inspectionTypeFilter, inspectorEmailFilter, makeFilter, modelFilter, reportIdFilter, selectedDamageAreaFilter, selectedFacilityKey, selectedSeverityLevel, statusFilter, vinFilter, yardFilter]
  );
  const analyticsParams = useMemo(
    () => ({
      ...buildDashboardAnalyticsParams(currentHomeAnalyticsFilters),
      suborg: getPortalSuborgValue(selectedOrganizationScopeKey),
    }),
    [currentHomeAnalyticsFilters, selectedOrganizationScopeKey]
  );
  const organizationScopeParams = useMemo(
    () => ({ suborg: getPortalSuborgValue(selectedOrganizationScopeKey) }),
    [selectedOrganizationScopeKey]
  );
  const {
    data: baseAnalyticsSnapshot,
    isValidating: baseAnalyticsValidating,
  } = useDashboardAnalyticsSnapshot(organizationScopeParams);
  const {
    data: analyticsSnapshot,
    error: analyticsError,
    isLoading: analyticsLoading,
    isValidating: analyticsValidating,
    hasCachedData: analyticsHasCachedData,
  } = useDashboardAnalyticsSnapshot(analyticsParams);
  const { data: baseFilterSnapshot } = useHomeAnalyticsSnapshot(organizationScopeParams);

  const facilities = useMemo(() => directory?.facilities ?? [], [directory]);
  const facilitySource = facilities.length > 0 ? facilities : undefined;
  const dashboardAnalytics = analyticsSnapshot as DashboardAnalyticsPayload | undefined;
  const fullFilterOptions = useMemo(
    () => getPortalAnalyticsFilterOptions(baseFilterSnapshot, baseAnalyticsSnapshot),
    [baseAnalyticsSnapshot, baseFilterSnapshot]
  );
  const analyticsErrorMessage = analyticsError instanceof Error ? analyticsError.message : analyticsError ? String(analyticsError) : null;
  const analyticsHasUsableData = Boolean(dashboardAnalytics);
  const analyticsRefreshInProgress = Boolean(
    analyticsHasUsableData && (analyticsValidating || baseAnalyticsValidating)
  );
  const reportsLoading = analyticsLoading;
  const reportsError = analyticsError;
  const activeInspectionTypeOptions = useMemo(
    () => fullFilterOptions.inspectionTypes.map((option) => ({
      number: option.value,
      label: option.label,
      displayLabel: `${option.value} - ${option.label}`,
    })),
    [fullFilterOptions.inspectionTypes]
  );
	  const facilityDamageStats = useMemo(
	    () =>
	      (baseAnalyticsSnapshot?.byFacility ?? baseAnalyticsSnapshot?.facilities ?? dashboardAnalytics?.byFacility ?? dashboardAnalytics?.facilities ?? [])
        .map((item) => normalizeAnalyticsFacility(item as Record<string, unknown>))
        .sort((a, b) => b.totalReports - a.totalReports),
    [baseAnalyticsSnapshot?.byFacility, baseAnalyticsSnapshot?.facilities, dashboardAnalytics?.byFacility, dashboardAnalytics?.facilities]
  );
	  const hasClientOnlyHomeFilters = Boolean(
    selectedFacilityKey !== "all" ||
      createdFrom ||
      createdTo ||
      reportIdFilter ||
      vinFilter ||
      inspectionTypeFilter ||
      makeFilter ||
      modelFilter ||
      yardFilter ||
      inspectorEmailFilter ||
      statusFilter ||
      selectedSeverityLevel !== "all" ||
      selectedDamageAreaFilter
  );
  const fallbackSummary = useMemo(() => buildDashboardSummary([], [], []), []);
  const currentOrganizationLabel = selectedOrganizationScope.label;
  const hideFacilitySelector = currentOrganizationLabel.trim().toLowerCase() === "free tier organization";
  const hideInspectorSections = hideFacilitySelector;
  const sanitizeFacilityDisplay = (value: string): string => normalizeFacilityDisplayLabel(value);
  const availableHomeFilterOptions = DAMAGE_FILTER_OPTIONS.filter(
    (option): option is (typeof DAMAGE_FILTER_OPTIONS)[number] & { key: HomeFilterKey } =>
      HOME_ANALYTICS_FILTER_KEYS.includes(option.key as HomeFilterKey)
  );
  const activeHomeFilterChips = useMemo(
    () => getActiveHomeFilterChips(currentHomeAnalyticsFilters),
    [currentHomeAnalyticsFilters]
  );
  const homeFilterSignature = useMemo(
    () => serializeHomeAnalyticsFilters(currentHomeAnalyticsFilters).toString(),
    [currentHomeAnalyticsFilters]
  );

  useEffect(() => {
    if (!didApplyInitialHomeFiltersRef.current) {
      didApplyInitialHomeFiltersRef.current = true;
      return;
    }
    setIsApplyingHomeFilters(true);
    const timeout = window.setTimeout(() => setIsApplyingHomeFilters(false), 220);
    return () => window.clearTimeout(timeout);
  }, [homeFilterSignature]);
  const clearHomeFilterValue = (key: HomeFilterKey) => {
    if (key === "facility") setSelectedFacilityKey("all");
    else if (key === "report_id") setReportIdFilter("");
    else if (key === "vin") setVinFilter("");
    else if (key === "inspection_type") setInspectionTypeFilter("");
    else if (key === "make") setMakeFilter("");
    else if (key === "model") setModelFilter("");
    else if (key === "yard") setYardFilter("");
    else if (key === "severity") setSelectedSeverityLevel("all");
    else if (key === "damage_area") setSelectedDamageAreaFilter("");
    else if (key === "inspector_email") setInspectorEmailFilter("");
    else if (key === "status") setStatusFilter("");
  };
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
    setInspectionTypeFilter("");
    setMakeFilter("");
    setModelFilter("");
    setYardFilter("");
    setInspectorEmailFilter("");
    setStatusFilter("");
    setSeverityFacilityBreakdown({ key: "", status: "idle", items: [] });
    setAreaFacilityBreakdown({ key: "", status: "idle", items: [] });
  };
  const renderHomeFilterControl = (key: (typeof activeHomeFilterKeys)[number]) => {
    if (key === "report_id") {
      return <input type="search" placeholder="Report ID" value={reportIdFilter} onChange={(e) => setReportIdFilter(e.target.value)} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />;
    }
    if (key === "vin") {
      return <input type="search" placeholder="VIN" value={vinFilter} onChange={(e) => setVinFilter(e.target.value.toUpperCase())} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />;
    }
    if (key === "inspection_type") {
      return (
        <select value={inspectionTypeFilter} onChange={(e) => setInspectionTypeFilter(e.target.value)} className="h-8 w-80 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300">
          <option value="">All inspection types</option>
          {activeInspectionTypeOptions.map((option) => (
            <option key={option.number} value={option.number}>{option.number} - {option.label}</option>
          ))}
        </select>
      );
    }
    if (key === "make") {
      return <input type="search" placeholder="Make" value={makeFilter} onChange={(e) => setMakeFilter(e.target.value)} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />;
    }
    if (key === "model") {
      return <input type="search" placeholder="Model" value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />;
    }
    if (key === "yard") {
      return <select value={yardFilter} onChange={(e) => setYardFilter(e.target.value)} className="h-8 w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"><option value="">All yards</option>{fullFilterOptions.yards.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
    }
    if (key === "inspector_email") {
      return (
        <select
          value={inspectorEmailFilter}
          onChange={(e) => setInspectorEmailFilter(e.target.value)}
          className="h-8 w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
        >
          <option value="">All inspectors</option>
          {fullFilterOptions.inspectors.map((inspector) => (
            <option key={inspector.value} value={inspector.value}>
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
          {(fullFilterOptions.statuses.length ? fullFilterOptions.statuses : ["open", "review", "closed", "verified", "archived"].map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))).map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      );
    }
    if (key === "severity") {
      return (
        <select value={selectedSeverityLevel} onChange={(e) => setSelectedSeverityLevel(normalizeSeverityFilterValue(e.target.value))} className="h-8 w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300">
          <option value="all">All severities</option>
          {homeSeverityFilterOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }
    if (key === "damage_area") {
      return <select value={selectedDamageAreaFilter} onChange={(e) => setSelectedDamageAreaFilter(e.target.value)} className="h-8 w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"><option value="">All damage areas</option>{fullFilterOptions.damageAreas.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>;
    }
    return null;
  };

  useEffect(() => {
    if (!didMountOrganizationResetRef.current) {
      didMountOrganizationResetRef.current = true;
      return;
    }
    setSelectedFacilityKey("all");
    setSelectedSeverityLevel("all");
    setSelectedDamageAreaFilter("");
    setCreatedFrom("");
    setCreatedTo("");
    setReportIdFilter("");
    setVinFilter("");
    setInspectionTypeFilter("");
    setMakeFilter("");
    setModelFilter("");
    setYardFilter("");
    setInspectorEmailFilter("");
    setStatusFilter("");
    setSeverityFacilityBreakdown({ key: "", status: "idle", items: [] });
    setAreaFacilityBreakdown({ key: "", status: "idle", items: [] });
    pieFacilityBreakdownCacheRef.current.clear();
  }, [selectedOrganizationScopeKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = serializeHomeAnalyticsFilters(currentHomeAnalyticsFilters);
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }, [currentHomeAnalyticsFilters]);

	  const inspectorChoices = useMemo(
	    () => {
        const choices = buildAnalyticsInspectorSummaries(dashboardAnalytics, homeCountMode);
        if (!inspectorEmailFilter) return choices;
        const selectedInspector = normalizeSearchText(inspectorEmailFilter);
        return choices.filter((choice) =>
          [choice.email, choice.label].some((value) => normalizeSearchText(value) === selectedInspector)
        );
      },
	    [dashboardAnalytics, homeCountMode, inspectorEmailFilter]
	  );
  const filteredFacilityStats = useMemo(
    () =>
      (dashboardAnalytics?.byFacility ?? dashboardAnalytics?.facilities ?? [])
        .map((item) => normalizeAnalyticsFacility(item as Record<string, unknown>))
        .filter((facility) => isHomeVisibleFacility(facility.label))
        .sort((a, b) => b.totalReports - a.totalReports),
    [dashboardAnalytics?.byFacility, dashboardAnalytics?.facilities]
  );
  const homeFacilityFilterOptions = useMemo(() => {
    const optionsByLabel = new Map<string, (typeof fullFilterOptions.facilities)[number]>();
    const optionValues = new Set<string>();
    fullFilterOptions.facilities.forEach((option) => {
      const label = sanitizeFacilityDisplay(option.label);
      const normalizedLabel = normalizeSearchText(label);
      const matchingFacility = facilityDamageStats.find(
        (facility) => normalizeSearchText(sanitizeFacilityDisplay(facility.label)) === normalizedLabel
      );
      const value = matchingFacility?.key && matchingFacility.key !== "other"
        ? matchingFacility.key
        : option.value;
      const normalizedValue = normalizeSearchText(value);
      if (
        !normalizedLabel ||
        !normalizedValue ||
        optionsByLabel.has(normalizedLabel) ||
        optionValues.has(normalizedValue)
      ) {
        return;
      }
      optionValues.add(normalizedValue);
      optionsByLabel.set(normalizedLabel, {
        ...option,
        value,
        label,
      });
    });
    return Array.from(optionsByLabel.values());
  }, [facilityDamageStats, fullFilterOptions]);
  const homeSeverityFilterOptions = useMemo(() => {
    const source = fullFilterOptions.severities.length ? fullFilterOptions.severities : DAMAGE_SEVERITIES;
    const optionsByLevel = new Map<string, { value: string; label: string }>();
    source.forEach((option) => {
      const level = normalizeSeverityFilterValue(option.value);
      if (level === "all" || optionsByLevel.has(level)) return;
      optionsByLevel.set(level, {
        value: level,
        label: DAMAGE_SEVERITIES.find((severity) => severity.value === level)?.label ?? option.label,
      });
    });
    return Array.from(optionsByLevel.values()).sort((left, right) => Number(left.value) - Number(right.value));
  }, [fullFilterOptions.severities]);
  const inspectorChartRows = useMemo(
    () =>
      inspectorChoices
        .map((inspector) => ({
          email: inspector.email,
          label: inspector.label,
          shortLabel: inspector.label.includes("@") ? inspector.label.split("@")[0] : inspector.label,
          reportCount: Number(inspector.reportCount ?? 0),
          __breakdown: inspector.hasClearDamageSplit
            ? {
                reportCount: buildDamageClearBreakdown(inspector.damageCount ?? 0, inspector.clearCount ?? 0),
              }
            : undefined,
        }))
        .filter((item) => item.reportCount > 0)
        .sort((a, b) => b.reportCount - a.reportCount || a.label.localeCompare(b.label))
        .slice(0, 12),
    [inspectorChoices]
  );
  const reportDateBounds = useMemo(() => {
    const dates = (dashboardAnalytics?.dailyTrend?.length ? dashboardAnalytics.dailyTrend : fallbackSummary.dailyTrend)
      .map((row) => safeDate(row.date))
      .filter((date): date is Date => Boolean(date));
    return buildHomeDateBounds(dates);
  }, [dashboardAnalytics?.dailyTrend, fallbackSummary.dailyTrend]);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      return;
    }
    console.debug("[home.data]", {
      selectedOrganizationScopeKey,
      activeFilterCount: activeHomeFilterKeys.length,
      damageReportCount: dashboardAnalytics?.totals?.damageReports ?? 0,
      rsaReportCount: dashboardAnalytics?.totals?.rsaReports ?? 0,
      facilityOptionCount: facilityDamageStats.length,
      reportsLoading: analyticsLoading,
      reportsError: analyticsErrorMessage,
    });
  }, [
    facilityDamageStats.length,
    analyticsLoading,
    analyticsErrorMessage,
    dashboardAnalytics?.totals?.damageReports,
    dashboardAnalytics?.totals?.rsaReports,
    activeHomeFilterKeys.length,
    selectedOrganizationScopeKey,
  ]);

  const summary = useMemo(
    () => {
      const damageMonthToDate =
        readAnalyticsCurrentPeriod(dashboardAnalytics, ["damageMonthToDate", "damageReportsThisMonth", "damageThisMonth"]) ??
        readAnalyticsTotal(dashboardAnalytics, ["damageReportsThisMonth", "damageMonthToDate"]) ??
        0;
      const damageToday =
        readAnalyticsCurrentPeriod(dashboardAnalytics, ["damageToday", "damageEntriesToday"]) ??
        readAnalyticsTotal(dashboardAnalytics, ["damageReportsToday", "damageToday"]) ??
        0;
      const clearToday =
        readAnalyticsTotal(dashboardAnalytics, ["noDamageReportsToday", "clearReportsToday", "noDamageToday", "clearToday"]) ??
        0;
      const reportsToday = damageToday + clearToday;
      const damageLast7Days =
        readAnalyticsCurrentPeriod(dashboardAnalytics, ["damageLast7Days"]) ??
        readAnalyticsTotal(dashboardAnalytics, ["damageReportsLast7Days"]) ??
        0;
      const damageYearToDate =
        readAnalyticsCurrentPeriod(dashboardAnalytics, ["damageYearToDate", "damageReportsThisYear"]) ??
        readAnalyticsTotal(dashboardAnalytics, ["damageReportsThisYear", "damageYearToDate"]) ??
        0;
      const reportsLast7Days =
        readAnalyticsTotal(dashboardAnalytics, ["damageReportsLast7Days", "damageLast7Days"]) ?? damageLast7Days;
      const reportsThisWeek = reportsLast7Days;
      const reportsThisYear =
        readAnalyticsTotal(dashboardAnalytics, ["damageReportsThisYear", "damageYearToDate"]) ?? damageYearToDate;
      const totalReports =
        readAnalyticsTotal(dashboardAnalytics, ["totalReports", "reports", "count"]) ?? 0;
      const damageReports =
        readAnalyticsTotal(dashboardAnalytics, ["damageReports", "damage_reports"]) ?? 0;
      const noDamageReports =
        readAnalyticsTotal(dashboardAnalytics, ["noDamageReports", "noDamageCount", "noDamageScans"]) ?? 0;
      const twentyFourHourReports =
        readAnalyticsTotal(dashboardAnalytics, ["twentyFourHourReports", "twentyFourHourCount", "reports24Hour", "reports24h"]) ?? 0;
      const inspection02Reports =
        readAnalyticsTotal(dashboardAnalytics, ["inspection02Reports", "inspection02Count", "type02Reports", "interchangeReports"]) ?? 0;
      const rsaReports =
        readAnalyticsTotal(dashboardAnalytics, ["rsaReports", "rsa_reports"]) ?? 0;
      const facilitiesCount =
        readAnalyticsTotal(dashboardAnalytics, ["facilities", "facilityCount"]) ?? filteredFacilityStats.length;
      const vinCount =
        readAnalyticsTotal(dashboardAnalytics, ["vins", "uniqueVINs", "uniqueVins"]) ?? 0;
	      const entriesCount = damageReports;
      const rsaToday =
        readAnalyticsCurrentPeriod(dashboardAnalytics, ["rsaToday"]) ??
        readAnalyticsTotal(dashboardAnalytics, ["rsaReportsToday"]) ??
        0;
      const rsaLast7Days =
        readAnalyticsCurrentPeriod(dashboardAnalytics, ["rsaLast7Days"]) ??
        readAnalyticsTotal(dashboardAnalytics, ["rsaReportsLast7Days"]) ??
        0;
      const reportsThisMonth =
        readAnalyticsCurrentPeriod(dashboardAnalytics, ["damageMonthToDate", "damageReportsThisMonth", "damageThisMonth"]) ??
        readAnalyticsTotal(dashboardAnalytics, ["damageReportsThisMonth", "damageMonthToDate"]) ??
        damageMonthToDate;
      const severity = normalizeDashboardSeverityItems(dashboardAnalytics, homeCountMode);
      const severityGroups = {
        low: Number(dashboardAnalytics?.severityGroups?.low ?? severity.filter((item) => Number(item.level) <= 2).reduce((sum, item) => sum + item.count, 0)),
        medium: Number(dashboardAnalytics?.severityGroups?.medium ?? severity.filter((item) => {
          const level = Number(item.level);
          return level >= 3 && level <= 4;
        }).reduce((sum, item) => sum + item.count, 0)),
        high: Number(dashboardAnalytics?.severityGroups?.high ?? severity.filter((item) => Number(item.level) >= 5).reduce((sum, item) => sum + item.count, 0)),
      };

      return ({
        totals: {
          totalReports,
          damageReports,
          noDamageReports,
          twentyFourHourReports,
          inspection02Reports,
          rsaReports,
          facilities: facilitiesCount,
          vins: vinCount,
          entries: entriesCount,
        },
        currentPeriod: {
          damageToday,
          clearToday,
          rsaToday,
          reportsToday,
          damageLast7Days,
          rsaLast7Days,
          reportsLast7Days,
          reportsThisWeek,
          damageMonthToDate,
          damageYearToDate,
          reportsThisMonth,
          reportsThisYear,
        },
        severity,
        severityGroups,
        dailyTrend: dashboardAnalytics?.dailyTrend?.length ? dashboardAnalytics.dailyTrend : [],
        facilities: filteredFacilityStats.map((facility) => ({
          id: facility.key,
          name: facility.label,
          damageReports: facility.damageReports,
          rsaReports: facility.rsaReports,
          today: facility.reportsToday,
          last7Days: facility.reportsLast7Days,
          monthToDate: facility.reportsThisMonth,
          yearToDate: facility.reportsThisYear,
          vins: facility.vins,
          entries: facility.entries,
          highSeverityCount: 0,
          highSeverityPercent: 0,
          latestReportDate: null,
          topArea: null,
          topType: null,
          severity: [],
        })),
        topAreas: normalizeAnalyticsTopBuckets(dashboardAnalytics?.topAreas),
        topTypes: normalizeAnalyticsTopBuckets(dashboardAnalytics?.topTypes),
      }) as DashboardSummary;
    },
	    [dashboardAnalytics, filteredFacilityStats, homeCountMode]
	  );
  const chartSummary = summary;
	  const isDamageCountMode = homeCountMode === "damages";
	  const countNoun = isDamageCountMode ? "damage entries" : "damaged submissions";
	  const countNounTitle = isDamageCountMode ? "Damage Entries" : "Damaged Submissions";
	  const inspectionCountNoun = "inspection submissions";
	  const inspectionCountNounTitle = INSPECTION_SUBMISSIONS_SERIES;
  const hasBackendClearReports = Boolean(
    dashboardAnalytics?.totals &&
      ("noDamageReports" in dashboardAnalytics.totals ||
        "noDamageCount" in dashboardAnalytics.totals ||
        "noDamageScans" in dashboardAnalytics.totals)
  );
  const hasBackendDamageReports = Boolean(
    dashboardAnalytics?.totals &&
      ("damageReports" in dashboardAnalytics.totals ||
        "damage_reports" in dashboardAnalytics.totals)
  );
  const damageInspectionCount = hasBackendDamageReports
    ? summary.totals.damageReports
    : 0;
  const clearInspectionCount = hasBackendClearReports ? summary.totals.noDamageReports : 0;
	  const totalDamageSubmissionCount = damageInspectionCount;
	  const primaryDamageTotal = damageInspectionCount;
	  const primaryDamageToday = summary.currentPeriod.damageToday;
	  const primaryDamageMonthToDate = summary.currentPeriod.damageMonthToDate;
	  const totalReportsDetail = "Damage and clear submissions";
	  const severityPieData = useMemo(
	    () => buildSelectedSeverityPieData(chartSummary.severity as DashboardSeverityItem[], selectedSeverityLevel),
	    [chartSummary.severity, selectedSeverityLevel]
	  );
  const visibleSeverityPieData = useMemo(
    () => severityPieData.filter((item) => Number(item.count) > 0),
    [severityPieData]
  );
  const severityPieTotal = visibleSeverityPieData.reduce((sum, item) => sum + Number(item.count), 0);
  const severityFooterRows = useMemo(
    () => {
      const selectedLevel = normalizeSeverityFilterValue(selectedSeverityLevel);
      const visibleSeverityItems = selectedLevel === "all"
        ? chartSummary.severity
        : chartSummary.severity.filter((item) => normalizeSeverityFilterValue(item.level) === selectedLevel);
      return buildSeverityTotalRows(visibleSeverityItems as DashboardSeverityItem[]);
    },
    [chartSummary.severity, selectedSeverityLevel]
  );
  const areaCounts = useMemo(
    () => new Map((chartSummary.topAreas ?? []).map((item) => [item.name, item.count] as const)),
    [chartSummary.topAreas]
  );
	  const areaPieData = useMemo(
	    () => buildSelectedAreaPieData([...areaCounts.entries()].map(([name, count]) => ({ name, count })), selectedDamageAreaFilter),
	    [areaCounts, selectedDamageAreaFilter]
	  );
  const visibleAreaPieData = useMemo(
    () => areaPieData.filter((item) => Number(item.count) > 0),
    [areaPieData]
  );
  const areaPieTotal = visibleAreaPieData.reduce((sum, item) => sum + Number(item.count), 0);
  const getPieFacilityBreakdown = async (kind: "severity" | "area", slice: PieAreaDatum) => {
    const cacheKey = JSON.stringify({ kind, slice: slice.name, homeCountMode, analyticsParams });
    const cached = pieFacilityBreakdownCacheRef.current.get(cacheKey);
    if (cached) return { cacheKey, items: cached };

    const scopedParams: DashboardAnalyticsParams = { ...analyticsParams };
    if (kind === "severity") {
      scopedParams.severity = String(slice.name).split(" - ")[0];
    } else {
      scopedParams.damage_area = slice.name;
    }

    try {
      const scopedAnalytics = await fetchDashboardAnalytics(scopedParams);
      const counts = new Map<string, number>();
      for (const row of scopedAnalytics.byFacility ?? scopedAnalytics.facilities ?? []) {
        const record = row as Record<string, unknown>;
        const facility = normalizeAnalyticsFacility(record);
        const count = homeCountMode === "damages"
          ? readAnalyticsNumber(record, ["entries", "damageEntries", "totalDamages", "count"])
          : readAnalyticsNumber(record, ["damageReports", "damage_reports", "reportCount", "reports", "count", "totalReports"]);
        if (count > 0) {
          counts.set(facility.label, (counts.get(facility.label) ?? 0) + count);
        }
      }
      const items = [...counts.entries()]
        .map(([label, count]) => ({ label, count }))
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
      pieFacilityBreakdownCacheRef.current.set(cacheKey, items);
      return { cacheKey, items };
    } catch (error) {
      throw { cacheKey, error };
    }
  };
  const loadPieFacilityBreakdown = async (kind: "severity" | "area", slice: PieAreaDatum) => {
    const cacheKey = JSON.stringify({ kind, slice: slice.name, homeCountMode, analyticsParams });
    const cached = pieFacilityBreakdownCacheRef.current.get(cacheKey);
    if (cached) {
      const nextState: PieFacilityBreakdownState = { key: cacheKey, status: "ready", items: cached };
      if (kind === "severity") setSeverityFacilityBreakdown(nextState);
      else setAreaFacilityBreakdown(nextState);
      return;
    }

    const loadingState: PieFacilityBreakdownState = { key: cacheKey, status: "loading", items: [] };
    if (kind === "severity") setSeverityFacilityBreakdown(loadingState);
    else setAreaFacilityBreakdown(loadingState);

    try {
      const { items } = await getPieFacilityBreakdown(kind, slice);
      if (kind === "severity") {
        setSeverityFacilityBreakdown((current) => current.key === cacheKey ? { key: cacheKey, status: "ready", items } : current);
      } else {
        setAreaFacilityBreakdown((current) => current.key === cacheKey ? { key: cacheKey, status: "ready", items } : current);
      }
    } catch {
      if (kind === "severity") {
        setSeverityFacilityBreakdown((current) => current.key === cacheKey ? { key: cacheKey, status: "error", items: [] } : current);
      } else {
        setAreaFacilityBreakdown((current) => current.key === cacheKey ? { key: cacheKey, status: "error", items: [] } : current);
      }
    }
  };
  const buildPieFacilityExportRows = async (
    kind: "severity" | "area",
    categoryHeader: string,
    slices: PieAreaDatum[],
    pieTotal: number
  ) => {
    const breakdowns = await Promise.all(
      slices.map(async (slice) => {
        try {
          return {
            slice,
            items: (await getPieFacilityBreakdown(kind, slice)).items,
          };
        } catch {
          return { slice, items: [] as PieBreakdownItem[] };
        }
      })
    );
    const pivotRows = breakdowns.map(({ slice, items }) => {
      const counts = new Map(items.map((facility) => [facility.label, facility.count] as const));
      const attributedTotal = items.reduce((sum, facility) => sum + facility.count, 0);
      if (attributedTotal < slice.count) {
        counts.set("Unattributed", slice.count - attributedTotal);
      }
      return {
        slice,
        counts,
        total: [...counts.values()].reduce((sum, count) => sum + count, 0),
      };
    });
    const facilityLabels = [...new Set(pivotRows.flatMap((row) => [...row.counts.keys()]))]
      .sort((left, right) => {
        if (left === "Unattributed") return 1;
        if (right === "Unattributed") return -1;
        return left.localeCompare(right);
      });
    const reconciledTotal = pivotRows.reduce((sum, row) => sum + row.total, 0);
    return [
      [categoryHeader, ...facilityLabels, "Total", "Percentage"],
      ...pivotRows.map((row) => [
        row.slice.name,
        ...facilityLabels.map((facility) => row.counts.get(facility) ?? 0),
        row.total,
        formatPieExportPercentage(row.total, reconciledTotal || pieTotal),
      ]),
    ];
  };
  const exportPieFacilityCsv = async (
    kind: "severity" | "area",
    categoryHeader: string,
    filenamePrefix: string,
    slices: PieAreaDatum[],
    pieTotal: number
  ) => {
    const cardRows = await buildPieFacilityExportRows(kind, categoryHeader, slices, pieTotal);
    exportVisualizedCardCsv({ filenamePrefix, cardRows });
  };
  const allAreaRows = useMemo(
    () =>
      [...areaCounts.entries()]
        .filter(([name]) => !selectedDamageAreaFilter || normalizeSearchText(name) === normalizeSearchText(selectedDamageAreaFilter))
        .map(([name, count]) => ({ name, count })),
    [areaCounts, selectedDamageAreaFilter]
  );
  const areaFooterRows = useMemo(
    () => buildAreaTotalRows(allAreaRows),
    [allAreaRows]
  );
  const areaCarRows = useMemo(
    () => buildAreaTotalRows(allAreaRows),
    [allAreaRows]
  );
  const facilityTrendRange = useMemo(
    () =>
      clampDateRangeToThirtyDays(
        createdFrom || null,
        createdTo || null,
        safeDate(reportDateBounds.maxDate)
      ),
    [createdFrom, createdTo, reportDateBounds.maxDate]
  );
  const facilityTrend = useMemo(() => {
    const trend = buildDailyAnalyticsTrend(
      dashboardAnalytics,
      facilityTrendRange,
      homeCountMode
    );
    const colors = buildFacilityColorMap(trend.keys);
    return {
      source: trend.source,
      range: {
        from: toDateInputValue(facilityTrendRange.start),
        to: toDateInputValue(facilityTrendRange.end),
        days: daysBetween(facilityTrendRange.start, facilityTrendRange.end) + 1,
      },
      facilities: trend.keys,
      colors,
      rows: trend.rows,
    };
  }, [dashboardAnalytics, facilityTrendRange, homeCountMode]);
  const inspectorTrend = useMemo(() => {
    const trend = buildInspectorDailyTrendData(
      dashboardAnalytics,
      [],
      HOME_DEFAULT_TREND_DAYS,
      homeCountMode,
      facilityTrendRange,
      inspectorEmailFilter
    );
    const totals = trend.keys.reduce<Map<string, number>>((acc, key) => {
      acc.set(
        key,
        trend.data.reduce((sum, row) => sum + Number(row[key] ?? 0), 0)
      );
      return acc;
    }, new Map());
    const keys = [...trend.keys]
      .sort((left, right) => (totals.get(right) ?? 0) - (totals.get(left) ?? 0) || left.localeCompare(right))
      .slice(0, 12);
    const rows = trend.data.map((row) => {
      const nextRow: TrendRow = { date: String(row.date) };
      const sourceBreakdown = row.__breakdown;
      const filteredBreakdown: TrendBreakdownMap = {};
      keys.forEach((key) => {
        nextRow[key] = Number(row[key] ?? 0);
        if (sourceBreakdown?.[key]) {
          filteredBreakdown[key] = sourceBreakdown[key];
        }
      });
      if (Object.keys(filteredBreakdown).length) {
        nextRow.__breakdown = filteredBreakdown;
      }
      return nextRow;
    });
    return {
      range: {
        from: toDateInputValue(facilityTrendRange.start),
        to: toDateInputValue(facilityTrendRange.end),
        days: daysBetween(facilityTrendRange.start, facilityTrendRange.end) + 1,
      },
      inspectors: keys,
      colors: buildInspectorColorMap(keys),
      rows,
      hasDailyData: rows.some((row) => keys.some((key) => Number(row[key] ?? 0) > 0)),
    };
  }, [dashboardAnalytics, facilityTrendRange, homeCountMode, inspectorEmailFilter]);
  const inspectorSummaryColors = useMemo(
    () => buildInspectorColorMap(inspectorChartRows.map((item) => item.label)),
    [inspectorChartRows]
  );
  const devStatsPayload = useMemo(
    () => ({
      capturedAt: new Date().toISOString(),
      route: "/home",
      purpose: "Compact visual data audit. Each section below maps to one visible home dashboard visual.",
      filters: {
        organizationId,
        selectedOrganizationScopeKey,
        homeCountMode,
        analyticsParams,
        selectedFacilityKey,
        selectedSeverityLevel,
        selectedDamageAreaFilter,
      },
      status: {
        loading: {
          directory: isLoading,
          analytics: analyticsLoading,
          analyticsRefreshing: analyticsRefreshInProgress,
        },
        errors: {
          directory: error instanceof Error ? error.message : error ? String(error) : null,
          analytics: analyticsErrorMessage,
        },
        cache: {
          analyticsHasCachedData,
          analyticsHasUsableData,
        },
      },
	      sources: {
	        analyticsEndpoint: DASHBOARD_ANALYTICS_ENDPOINT,
	        directoryEndpoint: "portal directory snapshot",
	        note: "Home cards, charts, facility breakdowns, and exports use /api/dashboard/analytics statistics.",
	      },
	      sourceCounts: {
	        analyticsFacilityRows: (dashboardAnalytics?.byFacility ?? dashboardAnalytics?.facilities ?? []).length,
	        sharedRsaReports: 0,
	      },
      reportCacheStatus: {
        sharedPartialError: null,
        sharedLastUpdated: null,
        damageStatus: null,
        rsaStatus: null,
      },
      pages: {
        home: {
          route: "/home",
          analyticsTotals: dashboardAnalytics?.totals ?? null,
          analyticsCurrentPeriod: dashboardAnalytics?.currentPeriod ?? null,
        },
	        damage: {
	          route: "/reports/damage/",
	          source: "VIN sheet preview is loaded on /home from /reports/list; full VIN exports fetch every available matching page on demand.",
	        },
      },
      cards: [
        {
          label: "Damage Reports Today",
          value: summary.currentPeriod.damageToday,
          detail: `Total reports today ${formatNumber(summary.currentPeriod.reportsToday)}`,
        },
        {
          label: "Total Damage Reports",
          value: summary.totals.damageReports,
          detail: `Month to date ${formatNumber(summary.currentPeriod.damageMonthToDate)}`,
        },
        {
          label: "Unique Inspectors",
          value: inspectorChoices.length,
          detail: "Inspectors in filtered data",
        },
        {
          label: "Active Facilities",
          value: summary.totals.facilities,
          detail: "Facilities in filtered data",
        },
      ],
      visuals: {
        facilityDamageReportsBarChart: {
          title: `Daily ${inspectionCountNounTitle}`,
          source: facilityTrend.source,
          range: facilityTrend.range,
          series: facilityTrend.facilities,
          colors: facilityTrend.colors,
          rowCount: facilityTrend.rows.length,
          rows: facilityTrend.rows,
        },
        inspectorDailyBarChart: {
          title: `Daily Inspector ${inspectionCountNounTitle}`,
          source: "/api/dashboard/analytics byInspectorDaily",
          range: inspectorTrend.range,
          series: inspectorTrend.inspectors,
          colors: inspectorTrend.colors,
          rowCount: inspectorTrend.rows.length,
          rows: inspectorTrend.rows,
        },
	        facilityDamageCountsTable: {
	          title: `Facility ${countNounTitle} Counts`,
	          rowCount: filteredFacilityStats.length,
	          rows: filteredFacilityStats.map((facility) => ({
	            facility: sanitizeFacilityDisplay(facility.label),
	            value: isDamageCountMode ? facility.entries : facility.damageReports,
	            unit: countNoun,
	            damageReports: facility.damageReports,
	            damageEntries: facility.entries,
	            totalReports: facility.totalReports,
	            rsaReports: facility.rsaReports,
	          })),
        },
        severityPie: {
          title: "Severity Detail",
          selectedSeverityLevel,
          sliceCount: visibleSeverityPieData.length,
          slices: visibleSeverityPieData.map((slice) => ({
            name: slice.name,
            count: slice.count,
            metric: countNoun,
          })),
          footerRows: severityFooterRows.map((group) => ({
            section: group.section,
            total: group.rows.reduce((sum, row) => sum + row.count, 0),
            rows: group.rows.map((row) => ({
              label: row.car,
              count: row.count,
              severity: row.severity ?? null,
            })),
          })),
        },
        damageAreasPie: {
          title: "Top Damage Areas",
          selectedDamageAreaFilter: selectedDamageAreaFilter || "all",
          sliceCount: visibleAreaPieData.length,
          slices: visibleAreaPieData.map((slice) => ({
            name: slice.name,
            count: slice.count,
            metric: countNoun,
          })),
          footerRows: areaFooterRows.map((group) => ({
            section: group.section,
            total: group.rows.reduce((sum, row) => sum + row.count, 0),
            rows: group.rows.map((row) => ({
              label: row.car,
              count: row.count,
            })),
          })),
        },
      },
      backendFieldPresence: {
        totalsKeys: Object.keys((dashboardAnalytics?.totals ?? {}) as Record<string, unknown>).sort(),
        currentPeriodKeys: Object.keys((dashboardAnalytics?.currentPeriod ?? {}) as Record<string, unknown>).sort(),
        requiredTotalsMissing: REQUIRED_STATS_TOTAL_KEYS.filter(
          (key) => !Object.prototype.hasOwnProperty.call((dashboardAnalytics?.totals ?? {}) as Record<string, unknown>, key)
        ),
        requiredCurrentPeriodMissing: REQUIRED_STATS_CURRENT_PERIOD_KEYS.filter(
          (key) => !Object.prototype.hasOwnProperty.call((dashboardAnalytics?.currentPeriod ?? {}) as Record<string, unknown>, key)
        ),
        byFacilityRows: (dashboardAnalytics?.byFacility ?? dashboardAnalytics?.facilities ?? []).length,
        byInspectorRows: dashboardAnalytics?.byInspector?.length ?? 0,
        byInspectorDailyRows: ((dashboardAnalytics as { byInspectorDaily?: unknown[] } | undefined)?.byInspectorDaily ?? []).length,
        severityRows: dashboardAnalytics?.severity?.length ?? 0,
	        topAreaRows: dashboardAnalytics?.topAreas?.length ?? 0,
	        facilityDailyRowsFromAnalytics: ((dashboardAnalytics as { byFacilityDaily?: unknown[]; facilityDaily?: unknown[] } | undefined)?.byFacilityDaily ?? []).length +
	          ((dashboardAnalytics as { byFacilityDaily?: unknown[]; facilityDaily?: unknown[] } | undefined)?.facilityDaily ?? []).length,
	      },
    }),
    [
      analyticsErrorMessage,
      analyticsHasCachedData,
      analyticsHasUsableData,
      analyticsLoading,
      analyticsParams,
      analyticsRefreshInProgress,
      areaFooterRows,
      dashboardAnalytics,
	      countNoun,
	      countNounTitle,
	      error,
      facilityTrend.colors,
      facilityTrend.facilities,
      facilityTrend.range,
      facilityTrend.rows,
      facilityTrend.source,
      filteredFacilityStats,
      inspectorTrend.colors,
      inspectorTrend.inspectors,
      inspectorTrend.range,
      inspectorTrend.rows,
	      inspectorChoices.length,
	      inspectionCountNounTitle,
	      isDamageCountMode,
	      isLoading,
		      organizationId,
	      selectedDamageAreaFilter,
      selectedFacilityKey,
      selectedOrganizationScopeKey,
      selectedSeverityLevel,
      severityFooterRows,
      visibleAreaPieData,
      visibleSeverityPieData,
      summary.currentPeriod.damageMonthToDate,
      summary.currentPeriod.damageToday,
      summary.currentPeriod.reportsToday,
      summary.totals.damageReports,
      summary.totals.facilities,
	      homeCountMode,
    ]
  );
  const copyDevStatsPayload = async () => {
    const payload = JSON.stringify(devStatsPayload, null, 2);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = payload;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setDevStatsCopyStatus("copied");
      window.setTimeout(() => setDevStatsCopyStatus("idle"), 1800);
    } catch (copyError) {
      console.warn("[home.devStats] copy failed", copyError);
      setDevStatsCopyStatus("failed");
      window.setTimeout(() => setDevStatsCopyStatus("idle"), 2200);
    }
  };
	  const downloadDevStatsPayload = () => {
	    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
	    downloadJson(`portal-local-data-dump-${timestamp}.json`, devStatsPayload);
	  };
  const buildAllVisualizedRows = async (): Promise<unknown[][]> => [
    ["Dashboard Summary"],
    ["Metric", "Value"],
    ["Total Damage Submissions", totalDamageSubmissionCount],
    ["Damaged Submissions Today", primaryDamageToday],
    ["Damaged Submissions", primaryDamageTotal],
    ["Clear Submissions", clearInspectionCount],
    ["Active Facilities", summary.totals.facilities],
    ["Unique Inspectors", inspectorChoices.length],
    [],
    ["Active Filters"],
    ["Filter", "Value"],
    ...(activeHomeFilterChips.length
      ? activeHomeFilterChips.map((chip) => [chip.label, chip.value])
      : [["None", "All data"]]),
    [],
    [`Daily ${inspectionCountNounTitle}`],
    ...buildCategoryTrendExportRows("Facility", facilityTrend.rows, facilityTrend.facilities),
    [],
    [inspectorTrend.hasDailyData ? `Daily Inspector ${inspectionCountNounTitle}` : `Inspector ${inspectionCountNounTitle}`],
    ...(inspectorTrend.hasDailyData
      ? buildCategoryTrendExportRows("Inspector", inspectorTrend.rows, inspectorTrend.inspectors)
      : [
          ["Inspector", "Email", inspectionCountNounTitle, "Damaged", "Clear"],
          ...inspectorChartRows.map((item) => {
            const split = readDamageClearBreakdown(item.__breakdown?.reportCount);
            return [item.label, item.email, item.reportCount, split?.damageCount ?? "", split?.clearCount ?? ""];
          }),
        ]),
    [],
    ["Severity Detail"],
    ...(await buildPieFacilityExportRows("severity", "Severity", visibleSeverityPieData, severityPieTotal)),
    [],
    ["Top Damage Areas"],
    ...(await buildPieFacilityExportRows("area", "Damage Area", visibleAreaPieData, areaPieTotal)),
  ];
  if (sessionStatus === "loading" || sessionStatus === "authenticating") {
    return <HomeLoadingShell message="Loading your portal session..." />;
  }

	  if (!organizationId) {
    return <EmptyState title="Home unavailable" description="Organization session required." />;
  }

  if (isLoading && !directory) {
    return <HomeLoadingShell message="Loading directory and analytics data..." />;
  }

  if (error && !directory) {
    return <EmptyState title="Home data unavailable" description="Directory snapshot could not be loaded." tone="danger" />;
  }

  if (!analyticsHasUsableData && analyticsLoading) {
    return <HomeLoadingShell message={analyticsHasCachedData ? "Restoring cached analytics..." : "Loading analytics..."} />;
  }

  if (analyticsError && !analyticsHasUsableData) {
    return <EmptyState title="Home data unavailable" description="Report data could not be loaded." tone="danger" />;
  }
  const reportTrend = chartSummary.dailyTrend.length
    ? {
        mode: "daily" as const,
        xKey: "date" as const,
        keys: ["damageReports", "rsaReports"] as const,
        data: chartSummary.dailyTrend,
      }
    : buildReportTrendView(dashboardAnalytics, filteredFacilityStats);
  const palette = ["#2563eb", "#dc2626", "#0f766e", "#7c3aed", "#ea580c", "#16a34a", "#db2777", "#0ea5e9"];
  const reportTrendColors = new Map(reportTrend.keys.map((key, index) => [key, palette[index % palette.length]] as const));
  const selectFacilityFromChart = (facilityLabel: string) => {
    const normalizedFacilityLabel = sanitizeFacilityDisplay(facilityLabel);
    const matched =
      filteredFacilityStats.find((stats) => sanitizeFacilityDisplay(stats.label) === normalizedFacilityLabel) ??
      homeFacilityFilterOptions.find((stats) => sanitizeFacilityDisplay(stats.label) === normalizedFacilityLabel);
    if (matched) {
      setSelectedFacilityKey("key" in matched ? matched.key : matched.value);
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
    <div className="relative w-full space-y-6 pb-6">
          {isApplyingHomeFilters ? (
            <div className="absolute inset-0 z-[70] rounded-2xl bg-white px-3 pt-4">
              <PageLoadingScreen
                title="Applying dashboard filters"
                description="Updating the loaded analytics view..."
                detail="Using the active in-memory snapshot; no new dashboard request is being sent."
              />
            </div>
          ) : null}
          {showDevStatsCopyButton ? (
            <div className="fixed right-4 top-4 z-[80] hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={downloadDevStatsPayload}
                className="inline-flex h-9 items-center rounded-lg border border-slate-900 bg-white px-3 text-xs font-black uppercase tracking-[0.18em] text-slate-950 shadow-lg transition hover:bg-slate-100"
                title="Download a JSON dump of the local portal data behind home and damage views."
              >
                Download data dump
              </button>
              <button
                type="button"
                onClick={() => void copyDevStatsPayload()}
                className="inline-flex h-9 items-center rounded-lg border border-slate-900 bg-white px-3 text-xs font-black uppercase tracking-[0.18em] text-slate-950 shadow-lg transition hover:bg-slate-100"
                title="Copy a compact JSON audit of the data behind each visible home dashboard visual."
              >
                {devStatsCopyStatus === "copied"
                  ? "Visual data copied"
                  : devStatsCopyStatus === "failed"
                    ? "Copy failed"
                    : "Copy visual data"}
              </button>
            </div>
          ) : null}
          <AnalyticsStatusBanner
            refreshing={analyticsRefreshInProgress}
            errorMessage={analyticsHasUsableData ? analyticsErrorMessage : null}
          />
          <Card className="sticky top-0 z-30 overflow-visible border-slate-200 bg-white">
            <CardHeader
              title="Filters"
              subtitle="Filters scope the damage submissions analytics."
		              actions={
		                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={async () =>
                      exportVisualizedCardCsv({
                        filenamePrefix: "home-dashboard-visible-data",
                        cardRows: await buildAllVisualizedRows(),
                      })
                    }
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-black bg-white px-3 text-xs font-semibold text-black shadow-sm transition hover:bg-slate-50"
                  >
                    <Download className="h-4 w-4" />
                    Export visible CSV
                  </button>
		                  <button
		                    type="button"
		                    onClick={clearHomeFilters}
                    className="inline-flex h-8 items-center rounded-lg border border-black bg-white px-3 text-xs font-semibold text-black shadow-sm transition hover:bg-slate-50"
                  >
                    Clear filters
                  </button>
                  <DropdownMenu open={homeFilterMenuOpen} onOpenChange={setHomeFilterMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-black bg-white px-3 text-xs font-semibold text-black shadow-sm transition hover:bg-slate-100 aria-expanded:bg-slate-900 aria-expanded:text-white"
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
                              current.includes(option.key) ? current : [...current, option.key]
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
                  <span className="text-sm font-semibold text-slate-700">Organization</span>
                  <select
                    value={selectedOrganizationScopeKey}
                    onChange={(event) =>
                      switchOrganizationScope(
                        event.target.value as typeof selectedOrganizationScopeKey
                      )
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                  >
                    {organizationScopes.map((scope) => (
                      <option key={scope.key} value={scope.key}>
                        {scope.label}
                      </option>
                    ))}
                  </select>
                </label>
                {!hideFacilitySelector ? (
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-semibold text-slate-700">Facility</span>
                    <select
                      value={selectedFacilityKey}
                      onChange={(event) => setSelectedFacilityKey(event.target.value)}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="all">All facilities</option>
                      {homeFacilityFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {sanitizeFacilityDisplay(option.label)}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}

                <label className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">Severity</span>
                  <select
                    value={selectedSeverityLevel}
                    onChange={(event) => setSelectedSeverityLevel(normalizeSeverityFilterValue(event.target.value))}
                    className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                  >
                    <option value="all">All severities</option>
                    {homeSeverityFilterOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>

                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-semibold text-slate-700">Date Range</span>
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
                          <span className="w-24 shrink-0 truncate text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
                          {renderHomeFilterControl(key)}
                          <button
                            type="button"
                            onClick={() => {
                              clearHomeFilterValue(key);
                              setActiveHomeFilterKeys((current) => current.filter((item) => item !== key));
                            }}
                            className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
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
              {activeHomeFilterChips.length ? (
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  <span className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Applied</span>
                  {activeHomeFilterChips.map((chip) => (
                    <span key={`${chip.key}-${chip.value}`} className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {chip.label}: {chip.value}
                    </span>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid gap-4 xl:items-stretch">
	            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <MetricCard label="Total Damage Submissions" value={totalDamageSubmissionCount} detail={totalReportsDetail} icon={<FileText className="h-4 w-4" />} />
                <MetricCard accent label="Damaged Submissions Today" value={primaryDamageToday} detail={`Clear submissions today ${formatNumber(summary.currentPeriod.clearToday)}`} icon={<TriangleAlert className="h-4 w-4" />} />
                <MetricCard
                  label="Damage vs Clear"
                  value={<DamageClearMetricValue damageCount={primaryDamageTotal} clearCount={clearInspectionCount} />}
                  detail={
                    hasBackendClearReports
                      ? "From /api/dashboard/analytics totals"
                      : "Clear count falls back to loaded VIN preview"
                  }
                  icon={<FileText className="h-4 w-4" />}
                />
                <MetricCard label="Active Facilities" value={summary.totals.facilities} detail="Facilities in filtered damage submissions" icon={<Filter className="h-4 w-4" />} />
                <MetricCard label="Unique Inspectors" value={inspectorChoices.length} detail="Inspectors in filtered damage submissions" icon={<FileText className="h-4 w-4" />} />
              </div>

	              <div className="grid gap-4 xl:grid-cols-1">
	                <Card className="relative overflow-visible hover:z-20">
	                  <CardHeader
		                    title={`Daily ${inspectionCountNounTitle}`}
		                    subtitle={`30-day inspection totals by facility ending ${formatDateKeyLabel(facilityTrend.range.to)}.`}
	                    actions={
		                      <button
		                        type="button"
		                        onClick={() =>
	                            exportVisualizedCardCsv({
	                              filenamePrefix: "daily-facility-inspection-submissions",
	                              cardRows: buildCategoryTrendExportRows("Facility", facilityTrend.rows, facilityTrend.facilities),
	                            })
	                          }
		                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
		                      >
		                        <Download className="h-4 w-4" />
		                        Export CSV
		                      </button>
                    }
                  />
                  <CardContent className="flex h-[28rem] flex-col gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                      <span>Hover over any facility bar to see its total, Damaged, and Clear submissions.</span>
                    </div>
	                  <div className="min-h-0 w-full flex-1">
	                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
	                          <BarChart data={facilityTrend.rows} margin={{ top: 8, right: 16, left: 0, bottom: 12 }} barCategoryGap="16%">
	                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.colors.grid} />
	                            <XAxis
	                              dataKey="date"
	                              type="category"
	                              interval="preserveStartEnd"
	                              minTickGap={28}
	                              tickMargin={8}
	                              tickFormatter={(value) => formatEvenDateKeyLabel(String(value))}
	                              tick={{ fill: chartTheme.colors.text, fontSize: 11, fontWeight: 700 }}
	                              stroke={chartTheme.colors.grid}
	                            />
	                            <YAxis tick={{ fill: chartTheme.colors.text, fontSize: 13, fontWeight: 700 }} stroke={chartTheme.colors.grid} allowDecimals={false} />
	                            <Legend verticalAlign="top" align="left" iconType="square" wrapperStyle={{ paddingBottom: 12, fontSize: 13, fontWeight: 700 }} />
	                            <Tooltip content={<NonZeroBarTooltip />} labelFormatter={(value) => formatDateKeyLabel(String(value))} cursor={false} isAnimationActive={false} wrapperStyle={{ zIndex: 50, pointerEvents: "none" }} />
                              {facilityTrend.facilities.map((series) => (
                                <Bar
                                  key={series}
                                  dataKey={series}
                                  name={series}
                                  stackId="daily-analytics"
                                  fill={facilityTrend.colors[series] ?? chartTheme.colors.text}
                                  cursor="pointer"
	                              activeBar={false}
	                              isAnimationActive={false}
                                  onClick={() => {
                                    if (series !== INSPECTION_SUBMISSIONS_SERIES) {
                                      selectFacilityFromChart(series);
                                    }
                                  }}
                                />
                              ))}
	                          </BarChart>
	                    </ResponsiveContainer>
	                  </div>
                  </CardContent>
                </Card>

              </div>
            </div>
	          </div>


          {!hideInspectorSections ? (
            <div className="grid gap-4">
              <Card className="relative overflow-visible hover:z-20">
                <CardHeader
		                  title={inspectorTrend.hasDailyData ? `Daily Inspector ${inspectionCountNounTitle}` : `Inspector ${inspectionCountNounTitle}`}
		                  subtitle={inspectorTrend.hasDailyData ? `Per-day inspection totals by inspector for the selected range.` : `Inspection totals by inspector.`}
                  actions={
	                    <button
	                      type="button"
	                      onClick={() =>
	                        exportVisualizedCardCsv({
	                          filenamePrefix: inspectorTrend.hasDailyData ? "daily-inspector-inspection-submissions" : "inspector-inspection-submissions",
	                          cardRows: inspectorTrend.hasDailyData
	                            ? buildCategoryTrendExportRows("Inspector", inspectorTrend.rows, inspectorTrend.inspectors)
	                            : [
			                              ["Inspector", "Email", inspectionCountNounTitle, "Damaged", "Clear"],
	                                ...inspectorChartRows.map((item) => {
	                                  const split = readDamageClearBreakdown(item.__breakdown?.reportCount);
	                                  return [item.label, item.email, item.reportCount, split?.damageCount ?? "", split?.clearCount ?? ""];
	                                }),
	                              ],
	                        })
	                      }
	                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
	                    >
	                      <Download className="h-4 w-4" />
	                      Export CSV
	                    </button>
                  }
                />
                <CardContent className="flex h-[28rem] flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    <span>Hover over any inspector bar to see the total, Damaged, and Clear submissions.</span>
                  </div>
                  {inspectorTrend.hasDailyData ? (
	                <div className="min-h-0 w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                          <BarChart data={inspectorTrend.rows} margin={{ top: 8, right: 16, left: 0, bottom: 12 }} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.colors.grid} />
                            <XAxis
                              dataKey="date"
                              type="category"
	                          interval="preserveStartEnd"
	                          minTickGap={28}
                              tickMargin={8}
                              tickFormatter={(value) => formatEvenDateKeyLabel(String(value))}
                              tick={{ fill: chartTheme.colors.text, fontSize: 11, fontWeight: 700 }}
                              stroke={chartTheme.colors.grid}
                            />
                            <YAxis tick={{ fill: chartTheme.colors.text, fontSize: 13, fontWeight: 700 }} stroke={chartTheme.colors.grid} allowDecimals={false} />
                            <Tooltip
                              content={<NonZeroBarTooltip />}
                              labelFormatter={(value) => formatDateKeyLabel(String(value))}
	                          cursor={false}
	                          isAnimationActive={false}
	                          wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                            />
                            {inspectorTrend.inspectors.map((series) => (
                              <Bar
                                key={series}
                                dataKey={series}
                                name={series}
                                stackId="daily-inspector-analytics"
                                fill={inspectorTrend.colors[series] ?? palette[0]}
                                cursor="pointer"
	                            activeBar={false}
	                            isAnimationActive={false}
                                onClick={() => selectInspectorFromChart(series)}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
	                </div>
                  ) : inspectorChartRows.length ? (
	                <div className="min-h-0 w-full flex-1">
                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                          <BarChart data={inspectorChartRows} margin={{ top: 8, right: 16, left: 0, bottom: 12 }} barCategoryGap="16%">
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.colors.grid} />
                            <XAxis
                              dataKey="shortLabel"
                              type="category"
	                          interval="preserveStartEnd"
	                          minTickGap={18}
                              tickMargin={8}
                              tick={{ fill: chartTheme.colors.text, fontSize: 11, fontWeight: 700 }}
                              stroke={chartTheme.colors.grid}
                            />
                            <YAxis tick={{ fill: chartTheme.colors.text, fontSize: 13, fontWeight: 700 }} stroke={chartTheme.colors.grid} allowDecimals={false} />
	                        <Tooltip content={<NonZeroBarTooltip hideSeriesNames />} cursor={false} isAnimationActive={false} wrapperStyle={{ zIndex: 50, pointerEvents: "none" }} />
                            <Bar
                              dataKey="reportCount"
                              name={inspectionCountNounTitle}
                              cursor="pointer"
	                          activeBar={false}
	                          isAnimationActive={false}
                              onClick={(entry) => {
                                const label = (entry as { payload?: { label?: string } })?.payload?.label;
                                if (label) selectInspectorFromChart(label);
                              }}
                            >
                              {inspectorChartRows.map((entry) => (
                                <Cell key={entry.email} fill={inspectorSummaryColors[entry.label] ?? INSPECTOR_CHART_PALETTE[0]} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
	                </div>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
                      No inspector activity available.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}

          <div className="grid gap-4 xl:grid-cols-2">
            <Card className="relative overflow-visible hover:z-20">
              <CardHeader
                title="Severity Detail"
                subtitle="Damage submissions grouped by recorded measurement."
                actions={
                  <div className="flex min-w-[220px] flex-col items-end gap-2">
                    <select
                      aria-label="Filter pie charts by inspection type"
                      value={inspectionTypeFilter}
                      onChange={(event) => setInspectionTypeFilter(event.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="">All inspection types</option>
                      {activeInspectionTypeOptions.map((option) => (
                        <option key={option.number} value={option.number}>
                          {option.displayLabel}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void exportPieFacilityCsv(
                        "severity",
                        "Severity",
                        "severity-damage-submission-detail",
                        visibleSeverityPieData,
                        severityPieTotal
                      )}
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </button>
	                  </div>
                }
              />
              <CardContent className="flex flex-col p-0">
                <div className="space-y-5 px-6 pb-6 pt-5 sm:px-8">
                  <PieMetricStrip value={severityPieTotal} label="Measured submissions" detail="Total records in the current view" />
                  <div className="relative h-[360px] min-w-0 sm:h-[390px]">
                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                      <PieChart margin={{ top: 20, right: 42, bottom: 20, left: 42 }}>
                        <Tooltip
                          content={
                            <PieSummaryTooltip
                              sectionLabel="Severity section"
                              facilityBreakdown={severityFacilityBreakdown}
                            />
                          }
                          active={hoveredSeverityIndex !== null}
                          defaultIndex={hoveredSeverityIndex ?? undefined}
                          allowEscapeViewBox={{ x: true, y: true }}
                          cursor={false}
                          isAnimationActive={false}
                          wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                        />
                        <Pie
                          data={visibleSeverityPieData}
                          dataKey="count"
                          nameKey="name"
                          outerRadius="70%"
                          cx="50%"
                          cy="50%"
                          startAngle={90}
                          endAngle={-270}
                          label={(props) => (
                            <PieSliceCalloutLabel
                              {...props}
                              data={visibleSeverityPieData}
                              kind="severity"
                            />
                          )}
                          labelLine={false}
                          paddingAngle={2}
                          cornerRadius={4}
                          stroke="#ffffff"
                          strokeWidth={3}
                          isAnimationActive={false}
                          onMouseEnter={(_, index) => {
                            setHoveredSeverityIndex(index);
                            const slice = visibleSeverityPieData[index];
                            if (slice) void loadPieFacilityBreakdown("severity", slice);
                          }}
                          onMouseLeave={() => setHoveredSeverityIndex(null)}
                          onClick={(_, index) => {
                            const item = visibleSeverityPieData[index ?? -1];
                            if (item) {
                              const level = String(item.name).split(" - ")[0];
                              setSelectedSeverityLevel((current) => (current === level ? "all" : level));
                            }
                          }}
                        >
                          {visibleSeverityPieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <PieLegendList
                    items={visibleSeverityPieData}
                    total={severityPieTotal}
                    kind="severity"
                    onSelect={selectSeverityFromChart}
                  />
                </div>
                <ChartFooterTable
                  title={`${countNounTitle} by severity`}
                  items={severityFooterRows}
                  showSeverityPills
                />
              </CardContent>
            </Card>

            <Card className="relative overflow-visible hover:z-20">
              <CardHeader
                title="Top Damage Areas"
                subtitle="Most frequent locations in the selected view."
                actions={
                  <div className="flex min-w-[220px] flex-col items-end gap-2">
                    <select
                      aria-label="Filter pie charts by inspection type"
                      value={inspectionTypeFilter}
                      onChange={(event) => setInspectionTypeFilter(event.target.value)}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="">All inspection types</option>
                      {activeInspectionTypeOptions.map((option) => (
                        <option key={option.number} value={option.number}>
                          {option.displayLabel}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void exportPieFacilityCsv(
                        "area",
                        "Damage Area",
                        "damage-area-submission-detail",
                        visibleAreaPieData,
                        areaPieTotal
                      )}
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </button>
	                  </div>
                }
              />
              <CardContent className="flex flex-col p-0">
                <div className="space-y-5 px-6 pb-6 pt-5 sm:px-8">
                  <PieMetricStrip value={areaPieTotal} label="Top-area submissions" detail="Records represented by the leading damage areas" />
                  <div className="relative h-[360px] min-w-0 sm:h-[390px]">
                    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                      <PieChart margin={{ top: 20, right: 42, bottom: 20, left: 42 }}>
                        <Tooltip
                          content={
                            <PieSummaryTooltip
                              sectionLabel="Damage area"
                              facilityBreakdown={areaFacilityBreakdown}
                            />
                          }
                          active={hoveredAreaIndex !== null}
                          defaultIndex={hoveredAreaIndex ?? undefined}
                          allowEscapeViewBox={{ x: true, y: true }}
                          cursor={false}
                          isAnimationActive={false}
                          wrapperStyle={{ zIndex: 50, pointerEvents: "none" }}
                        />
                        <Pie
                          data={visibleAreaPieData}
                          dataKey="count"
                          nameKey="name"
                          outerRadius="70%"
                          cx="50%"
                          cy="50%"
                          startAngle={90}
                          endAngle={-270}
                          label={(props) => (
                            <PieSliceCalloutLabel
                              {...props}
                              data={visibleAreaPieData}
                              kind="area"
                            />
                          )}
                          labelLine={false}
                          paddingAngle={2}
                          cornerRadius={4}
                          stroke="#ffffff"
                          strokeWidth={3}
                          isAnimationActive={false}
                          onMouseEnter={(_, index) => {
                            setHoveredAreaIndex(index);
                            const slice = visibleAreaPieData[index];
                            if (slice) void loadPieFacilityBreakdown("area", slice);
                          }}
                          onMouseLeave={() => setHoveredAreaIndex(null)}
                          onClick={(_, index) => {
                            const item = visibleAreaPieData[index ?? -1];
                            if (item) {
                              selectAreaFromPie(item.name);
                            }
                          }}
                        >
                          {visibleAreaPieData.map((entry, index) => (
                            <Cell key={`${entry.name}-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <PieLegendList
                    items={visibleAreaPieData}
                    total={areaPieTotal}
                    kind="area"
                    onSelect={selectAreaFromPie}
                  />
                </div>
                <ChartFooterTable
                  title={`${countNounTitle} by damage area`}
                  items={areaFooterRows}
                  showRowCount={false}
                />
              </CardContent>
            </Card>
          </div>

    </div>
  );
}
