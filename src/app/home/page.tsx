"use client";
/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/set-state-in-effect, react-hooks/preserve-manual-memoization */

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import JSZip from "jszip";
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
} from "recharts";
import { EmptyState } from "@/components/ui/EmptyState";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
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
  useReportListSnapshot,
} from "@/lib/portalData";
import { usePortalSession } from "@/lib/portalSession";
import { buildFacilityDamageStats } from "@/lib/facilityDamageStats";
import { chartTheme } from "@/lib/chartTheme";
import { DAMAGE_SEVERITIES } from "@/lib/docudent/damageTaxonomy";
import { resolveDamageReportLocationName, resolveRsaFacilityLabel, stripFacilitySuffix } from "@/lib/reportUtils";
import { fetchDamageReportListSnapshot, type ReportListParams } from "@/lib/services/reportService";
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
  breakdown?: PieBreakdownItem[];
  inspectionCount?: number;
  damageCount?: number;
  clearCount?: number;
  vinSamples?: string[];
};

type PieBreakdownItem = {
  label: string;
  count: number;
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
    breakdown?: PieBreakdownItem[];
    __breakdown?: TrendBreakdownMap;
    inspectionCount?: number;
    damageCount?: number;
    clearCount?: number;
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

type HomeCountMode = "reports" | "damages";
type HomeFilterKey = "report_id" | "vin" | "inspection_type" | "make" | "model" | "yard" | "inspector_email" | "status";
type InspectionOutcome = "damage" | "clear" | "unknown";
type ExportCardContext = {
  filenamePrefix: string;
  title: string;
  cardFilters?: Array<[string, unknown]>;
  cardRows?: unknown[][];
  cardFiles?: Array<{ filename: string; rows: unknown[][] }>;
  filterReport?: (report: ReportDamageApiRow) => boolean;
};
type PieSliceLabelProps = {
  cx?: unknown;
  cy?: unknown;
  midAngle?: unknown;
  innerRadius?: unknown;
  outerRadius?: unknown;
  percent?: unknown;
  value?: unknown;
};

const SEVERITY_LABELS: Record<number, string> = {
  1: "≤1\" (≤3 cm)",
  2: ">1\" to ≤3\" (3–8 cm)",
  3: ">3\" to ≤6\" (8–15 cm)",
  4: ">6\" to ≤12\" (15–30 cm)",
  5: ">12\" (≥30 cm)",
  6: "Missing / Major Damage",
};

const HOME_VISIBLE_FACILITIES = ["JNAP", "SHAP"] as const;
const HOME_DEFAULT_TREND_DAYS = 30;
const HOME_FILTER_KEYS: HomeFilterKey[] = ["report_id", "vin", "inspection_type", "make", "model", "yard", "inspector_email", "status"];
const DASHBOARD_ANALYTICS_ENDPOINT = "/api/dashboard/analytics";
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

function sanitizeFileNameSegment(value: unknown, fallback = "item"): string {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return normalized || fallback;
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
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

function stableStringHash(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function colorForFacility(label: string, index: number): string {
  const hue = (index * 137.508 + stableStringHash(label) * 0.017) % 360;
  return `hsl(${Math.round(hue)} 74% 45%)`;
}

function buildFacilityColorMap(labels: string[]): Record<string, string> {
  return [...labels]
    .sort((left, right) => left.localeCompare(right))
    .reduce<Record<string, string>>((acc, label, index) => {
      acc[label] = colorForFacility(label, index);
      return acc;
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

function renderPieSliceLabel(props: PieSliceLabelProps) {
  const cx = Number(props.cx);
  const cy = Number(props.cy);
  const midAngle = Number(props.midAngle);
  const innerRadius = Number(props.innerRadius);
  const outerRadius = Number(props.outerRadius);
  const percent = Number(props.percent ?? 0);
  const value = Number(props.value ?? 0);

  if (
    !Number.isFinite(cx) ||
    !Number.isFinite(cy) ||
    !Number.isFinite(midAngle) ||
    !Number.isFinite(innerRadius) ||
    !Number.isFinite(outerRadius) ||
    !Number.isFinite(percent) ||
    !Number.isFinite(value) ||
    value <= 0 ||
    percent < 0.08
  ) {
    return null;
  }

  const radius = innerRadius + (outerRadius - innerRadius) * 0.62;
  const radians = (Math.PI / 180) * -midAngle;
  const x = cx + radius * Math.cos(radians);
  const y = cy + radius * Math.sin(radians);
  const label = percent >= 0.14 ? `${formatNumber(value)} (${Math.round(percent * 100)}%)` : `${Math.round(percent * 100)}%`;

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className="pointer-events-none text-[11px] font-black"
    >
      {label}
    </text>
  );
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

function normalizeFacilityDisplayLabel(value: string | null | undefined): string {
  const normalized = stripFacilitySuffix((value ?? "").toString()).trim().replace(/\s+/g, " ");
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
  const normalized = normalizeFacilityDisplayLabel(value);
  const upper = normalized.toUpperCase();
  if (/\bJNAP\b/.test(upper)) return "JNAP";
  if (/\bSHAP\b/.test(upper)) return "SHAP";
  return normalized;
}

function isHomeVisibleFacility(value: string | null | undefined): boolean {
  return HOME_VISIBLE_FACILITIES.includes(resolveHomeFacilityLabel(value) as (typeof HOME_VISIBLE_FACILITIES)[number]);
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

function readAnalyticsNumber(item: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return 0;
}

function readAnalyticsString(item: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return fallback;
}

type TrendSplitPair = {
  damageCount: number;
  clearCount: number;
  hasSplitData: boolean;
};

const ANALYTICS_SPLIT_DAMAGE_KEYS_REPORTS = [
  "damageReports",
  "damage_reports",
  "reportsDamage",
  "damages",
  "damage_count",
];
const ANALYTICS_SPLIT_CLEAR_KEYS_REPORTS = [
  "noDamageReports",
  "noDamageCount",
  "noDamageScans",
  "clearReports",
  "clearCount",
  "clearScans",
  "clear_count",
  "clear_reports",
];
const ANALYTICS_SPLIT_DAMAGE_KEYS_ENTRIES = [
  "damageEntries",
  "totalDamages",
  "damage_count",
  "damageEntriesCount",
];
const ANALYTICS_SPLIT_CLEAR_KEYS_ENTRIES = [
  "clearEntries",
  "clearCount",
  "noDamageCount",
  "noDamageScans",
  "clearScans",
  "clear_count",
  "clear_entries",
];
const ANALYTICS_TOTAL_KEYS_REPORTS = [
  "totalReports",
  "reportCount",
  "reports",
  "submissions",
  "totalSubmissions",
  "count",
];
const ANALYTICS_TOTAL_KEYS_ENTRIES = [
  "entries",
  "totalEntries",
  "damageEntries",
  "totalDamages",
  "count",
];

const ANALYTICS_DAILY_FACILITY_REQUIREMENTS = [
  "date (or day / created_date)",
  "facility label (label, facility, name, navigation, location_label, or location_name)",
  "damageReports (or damage_count)",
  "noDamageReports (or clearReports)",
];

const ANALYTICS_DAILY_INSPECTOR_REQUIREMENTS = [
  "date (or day / created_date)",
  "label / email (label, email)",
  "damageReports (or damage_count)",
  "noDamageReports (or clearReports)",
];

type AnalyticsClearDamageCoverage = {
  hasRows: boolean;
  splitRows: number;
  splitRowsMissingDamage: number;
  splitRowsMissingClear: number;
  hasClearDamageSplit: boolean;
  missingSourceFields: string[];
};

type AnalyticsDailySplitCoverage = {
  facility: AnalyticsClearDamageCoverage;
  inspector: AnalyticsClearDamageCoverage;
  endpoint: string;
  countMode: HomeCountMode;
};

function hasAnalyticsFieldValue(record: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => {
    const value = record[key];
    return typeof value === "number" && Number.isFinite(value) || (typeof value === "string" && value.trim() !== "");
  });
}

function readAnalyticsSplitPair(record: Record<string, unknown>, countMode: HomeCountMode): TrendSplitPair {
  const damageKeys = countMode === "damages" ? ANALYTICS_SPLIT_DAMAGE_KEYS_ENTRIES : ANALYTICS_SPLIT_DAMAGE_KEYS_REPORTS;
  const clearKeys = countMode === "damages" ? ANALYTICS_SPLIT_CLEAR_KEYS_ENTRIES : ANALYTICS_SPLIT_CLEAR_KEYS_REPORTS;
  const totalKeys = countMode === "damages" ? ANALYTICS_TOTAL_KEYS_ENTRIES : ANALYTICS_TOTAL_KEYS_REPORTS;
  const hasDamage = hasAnalyticsFieldValue(record, damageKeys);
  const hasClear = hasAnalyticsFieldValue(record, clearKeys);
  const hasTotal = hasAnalyticsFieldValue(record, totalKeys);
  const explicitDamageCount = hasDamage ? readAnalyticsNumber(record, damageKeys) : 0;
  const explicitClearCount = hasClear ? readAnalyticsNumber(record, clearKeys) : 0;
  const totalCount = hasTotal ? readAnalyticsNumber(record, totalKeys) : 0;
  const damageCount = hasDamage
    ? explicitDamageCount
    : hasClear && hasTotal
      ? Math.max(totalCount - explicitClearCount, 0)
      : 0;
  const clearCount = hasClear ? explicitClearCount : 0;
  const hasSplitData = hasDamage && hasClear;
  return {
    damageCount,
    clearCount,
    hasSplitData: hasSplitData || (hasClear && hasTotal),
  };
}

function collectAnalyticsDailySplitCoverage(
  rows: Array<Record<string, unknown>> | undefined,
  countMode: HomeCountMode,
  scopeLabel: string
): AnalyticsClearDamageCoverage {
  const resolvedRows = rows ?? [];
  const damageKeys = countMode === "damages" ? ANALYTICS_SPLIT_DAMAGE_KEYS_ENTRIES : ANALYTICS_SPLIT_DAMAGE_KEYS_REPORTS;
  const clearKeys = countMode === "damages" ? ANALYTICS_SPLIT_CLEAR_KEYS_ENTRIES : ANALYTICS_SPLIT_CLEAR_KEYS_REPORTS;

  let splitRows = 0;
  let splitRowsMissingDamage = 0;
  let splitRowsMissingClear = 0;
  for (const row of resolvedRows) {
    const hasDamage = hasAnalyticsFieldValue(row, damageKeys);
    const hasClear = hasAnalyticsFieldValue(row, clearKeys);
    if (hasDamage && hasClear) {
      splitRows += 1;
    }
    if (!hasDamage) {
      splitRowsMissingDamage += 1;
    }
    if (!hasClear) {
      splitRowsMissingClear += 1;
    }
  }

  const hasRows = resolvedRows.length > 0;
  const hasClearDamageSplit = splitRows > 0;
  const missingSourceFields = (() => {
    if (scopeLabel === "facility") {
      return [
        ...(!hasRows || splitRowsMissingDamage > 0
          ? countMode === "damages"
            ? ["damageEntries (for damaged count)"]
            : ["damageReports (or damage_count)"]
          : []),
        ...(!hasRows || splitRowsMissingClear > 0
          ? countMode === "damages"
            ? ["clearEntries (for clear count)"]
            : ["noDamageReports (or clearReports)"]
          : []),
      ];
    }
    return [
      ...(!hasRows || splitRowsMissingDamage > 0
        ? countMode === "damages"
          ? ["damageEntries (for damaged count)"]
          : ["damageReports (for damaged count)"]
        : []),
      ...(!hasRows || splitRowsMissingClear > 0
        ? countMode === "damages"
          ? ["clearEntries (for clear count)"]
          : ["noDamageReports (for clear count)"]
        : []),
    ];
  })();

  return {
    hasRows,
    splitRows,
    splitRowsMissingDamage,
    splitRowsMissingClear,
    hasClearDamageSplit,
    missingSourceFields,
  };
}

function buildDashboardDailySplitCoverage(
  analytics: DashboardAnalyticsPayload | undefined,
  countMode: HomeCountMode
): AnalyticsDailySplitCoverage {
  const facilityDailyRows = [
    ...(((analytics as { byFacilityDaily?: Array<Record<string, unknown>> } | undefined)?.byFacilityDaily ?? [])),
    ...(((analytics as { facilityDaily?: Array<Record<string, unknown>> } | undefined)?.facilityDaily ?? [])),
  ];
  const inspectorDailyRows = ((analytics as { byInspectorDaily?: Array<Record<string, unknown>> } | undefined)?.byInspectorDaily ?? []);

  return {
    facility: collectAnalyticsDailySplitCoverage(facilityDailyRows, countMode, "facility"),
    inspector: collectAnalyticsDailySplitCoverage(inspectorDailyRows, countMode, "inspector"),
    endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
    countMode,
  };
}

function buildTrendBreakdownForPair(damageCount: number, clearCount: number): PieBreakdownItem[] {
  const entries: PieBreakdownItem[] = [];
  if (damageCount > 0 || (damageCount === 0 && clearCount === 0)) {
    entries.push({ label: "Damage", count: Number.isFinite(damageCount) ? Number(damageCount) : 0 });
  }
  if (clearCount > 0 || (damageCount === 0 && clearCount === 0)) {
    entries.push({ label: "Clear", count: Number.isFinite(clearCount) ? Number(clearCount) : 0 });
  }
  return entries;
}

function isClearDamageBreakdown(entries: PieBreakdownItem[] | undefined): boolean {
  if (!entries || entries.length === 0) {
    return false;
  }
  if (entries.length > 2) return false;
  const labels = new Set(entries.map((entry) => String(entry.label).trim().toLowerCase()));
  return labels.has("damage") && labels.has("clear");
}

function formatClearDamagePair(entries: PieBreakdownItem[]): {
  damageCount: number;
  clearCount: number;
} {
  let damageCount = 0;
  let clearCount = 0;
  for (const entry of entries) {
    const label = String(entry.label).trim().toLowerCase();
    if (label === "damage") {
      damageCount = Number(entry.count);
    } else if (label === "clear") {
      clearCount = Number(entry.count);
    }
  }
  return {
    damageCount: Number.isFinite(damageCount) ? damageCount : 0,
    clearCount: Number.isFinite(clearCount) ? clearCount : 0,
  };
}

function mergeClearDamageBreakdown(
  existing: PieBreakdownItem[] | undefined,
  damageCount: number,
  clearCount: number
): PieBreakdownItem[] {
  const currentPair = existing && isClearDamageBreakdown(existing)
    ? formatClearDamagePair(existing)
    : { damageCount: 0, clearCount: 0 };
  return buildTrendBreakdownForPair(
    currentPair.damageCount + damageCount,
    currentPair.clearCount + clearCount
  );
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
          const seriesKey = String(item.dataKey ?? item.name ?? "");
          const breakdown = seriesKey ? item.payload?.__breakdown?.[seriesKey] ?? [] : [];
          const clearDamagePair = breakdown && isClearDamageBreakdown(breakdown) ? formatClearDamagePair(breakdown) : null;
          return (
            <div key={`${String(item.name)}-${item.dataKey ?? item.color ?? value}`} className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color || item.fill || chartTheme.colors.text }} />
                  <span className="text-slate-700">{hideSeriesNames ? "" : String(item.name)}</span>
                </div>
                <span className="font-bold text-slate-950">{formatNumber(value)}</span>
              </div>
              {clearDamagePair ? (
                <div className="ml-4 space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs">
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-rose-700">Damaged</span>
                    <span className="font-black text-rose-950">{formatNumber(clearDamagePair.damageCount)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="font-semibold text-emerald-700">Clear</span>
                    <span className="font-black text-emerald-950">{formatNumber(clearDamagePair.clearCount)}</span>
                  </div>
                </div>
              ) : null}
              {!clearDamagePair && breakdown.length ? (
                <div className="ml-4 space-y-1 border-l border-slate-200 pl-3 text-[11px] leading-4 text-slate-500">
                  {breakdown.map((entry) => (
                    <div key={entry.label} className="flex justify-between gap-3">
                      <span className="max-w-[220px] truncate">{entry.label}</span>
                      <span className="font-semibold text-slate-700">{formatNumber(entry.count)}</span>
                    </div>
                  ))}
                </div>
              ) : null}
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
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  const datum = item.payload ?? {};
  const sliceName = typeof datum.name === "string" || typeof datum.name === "number" ? String(datum.name) : "Summary";
  const breakdown = Array.isArray(datum.breakdown) ? datum.breakdown : [];
  const rawInspectionCount = Number(datum.inspectionCount ?? value);
  const rawDamageCount = Number(datum.damageCount ?? value);
  const rawClearCount = Number(datum.clearCount ?? 0);
  const inspectionCount = Number.isFinite(rawInspectionCount) ? rawInspectionCount : value;
  const damageCount = Number.isFinite(rawDamageCount) ? rawDamageCount : value;
  const clearCount = Number.isFinite(rawClearCount) ? rawClearCount : 0;
  const vinSamples = Array.isArray(datum.vinSamples) ? datum.vinSamples.filter(Boolean).slice(0, 8) : [];

  return (
    <div className="min-w-[260px] rounded-2xl border border-[color:var(--border-subtle)] bg-white p-3 shadow-lg">
      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">{sliceName}</p>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-2">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Submissions</p>
          <p className="mt-1 text-lg font-black tracking-tight text-slate-950">{formatNumber(inspectionCount)}</p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-2">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-rose-700">Damage</p>
          <p className="mt-1 text-lg font-black tracking-tight text-rose-950">{formatNumber(damageCount)}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-2">
          <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-700">Clear</p>
          <p className="mt-1 text-lg font-black tracking-tight text-emerald-950">{formatNumber(clearCount)}</p>
        </div>
      </div>
      {vinSamples.length ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-2">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">VIN samples</p>
          <p className="mt-1 max-w-[280px] break-words font-mono text-[11px] font-semibold text-slate-700">
            {vinSamples.join("  ")}
          </p>
        </div>
      ) : null}
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
  range?: { start: Date; end: Date }
): { data: TrendRow[]; keys: string[]; hasClearDamageSplit: boolean } {
  const analyticsRows = ((analytics as { byInspectorDaily?: Array<Record<string, unknown>> } | undefined)?.byInspectorDaily ?? [])
    .map((row) => {
      const splitCounts = readAnalyticsSplitPair(row, countMode);
      const fallbackCount = countMode === "damages"
        ? readRecordNumber(row, ["damageEntries", "totalDamages", "entries", "reportCount", "reports", "damageReports", "count"])
        : readRecordNumber(row, ["reportCount", "reports", "damageReports", "totalReports", "count"]);
      return {
        date: normalizeAnalyticsDateKey(row.date ?? row.day ?? row.created_date),
        label: String(row.label ?? row.email ?? "Unassigned").trim() || "Unassigned",
        splitCounts,
        reportCount: splitCounts.hasSplitData ? splitCounts.damageCount + splitCounts.clearCount : fallbackCount,
      };
    })
    .filter((row) => row.date && row.reportCount > 0);

  if (analyticsRows.length > 0) {
    const hasClearDamageSplit = analyticsRows.some((row) => row.splitCounts.hasSplitData);
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
          breakdown[row.label] = mergeClearDamageBreakdown(
            breakdown[row.label],
            row.splitCounts.damageCount,
            row.splitCounts.clearCount
          );
          bucket.__breakdown = breakdown;
        }
        bucket[row.label] = Number(bucket[row.label] ?? 0) + row.reportCount;
      }
    });
    return { data: rows, keys, hasClearDamageSplit };
  }

  return { ...buildInspectorTrendData(fallbackReports, days, range ? toDateInputValue(range.end) : undefined, countMode), hasClearDamageSplit: false };
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
        : readRecordNumber(record, ["reportCount", "damageReports", "reports", "totalReports"]);
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
): { source: string; rows: TrendRow[]; keys: string[]; hasClearDamageSplit: boolean } {
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
  let hasClearDamageSplit = false;

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
        : readAnalyticsNumber(item, ["damageReports", "damage_reports"]);
    if (value <= 0) continue;
    if (splitCounts.hasSplitData) {
      hasClearDamageSplit = true;
      const breakdown = row.__breakdown ?? {};
      breakdown[facility] = mergeClearDamageBreakdown(
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
      hasClearDamageSplit,
    };
  }

  const dailyRows = analytics?.dailyTrend ?? [];
  const keys = ["Damage Submissions"];
  for (const item of dailyRows) {
    const date = normalizeAnalyticsDateKey(item.date);
    const row = rows.get(date);
    if (!row) continue;
    const splitCounts = readAnalyticsSplitPair(item as Record<string, unknown>, countMode);
    const damageReportsValue = splitCounts.hasSplitData
      ? splitCounts.damageCount + splitCounts.clearCount
      : Number(item.damageReports ?? 0);
    row["Damage Submissions"] = Number.isFinite(damageReportsValue) ? damageReportsValue : Number(item.damageReports ?? 0);
    if (splitCounts.hasSplitData) {
      hasClearDamageSplit = true;
      const breakdown = row.__breakdown ?? {};
      breakdown["Damage Submissions"] = buildTrendBreakdownForPair(splitCounts.damageCount, splitCounts.clearCount);
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
    hasClearDamageSplit,
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
    const increment = countMode === "damages" ? getDamageEntryCount(report) : 1;
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

function ClearDamageMetricValue({
  damageCount,
  clearCount,
}: {
  damageCount: number;
  clearCount: number;
}) {
  return (
    <div className="flex items-center justify-center gap-4">
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-700">Damage</p>
        <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{formatNumber(damageCount)}</p>
      </div>
      <span className="h-10 w-px bg-slate-200" />
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Clear</p>
        <p className="mt-1 text-3xl font-black tracking-tight text-slate-950">{formatNumber(clearCount)}</p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
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
          <div className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</div>
          {detail ? <p className="mt-1 text-xs text-slate-600">{detail}</p> : null}
        </div>
      </div>
    </Card>
  );
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />;
}

function HomeLoadingShell({ message = "Loading analytics..." }: { message?: string }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <Card className="overflow-hidden border-slate-200/80 bg-white/95">
        <CardHeader title="Filters" subtitle={message} />
        <CardContent>
          <div className="grid gap-4 xl:grid-cols-4">
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
            <SkeletonBlock className="h-14" />
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={`metric-loading-${index}`} className="p-4">
            <div className="flex h-32 flex-col items-center justify-center gap-3">
              <SkeletonBlock className="h-9 w-9 rounded-full" />
              <SkeletonBlock className="h-3 w-28" />
              <SkeletonBlock className="h-8 w-20" />
              <SkeletonBlock className="h-3 w-32" />
            </div>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader title="Daily Analytics" subtitle="Preparing chart data." />
          <CardContent className="h-96">
            <SkeletonBlock className="h-full w-full" />
          </CardContent>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader title="Inspector Trend" subtitle="Preparing chart data." />
          <CardContent className="h-96">
            <SkeletonBlock className="h-full w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
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

function AnalyticsSplitCoverageAlert({ coverage }: { coverage: AnalyticsDailySplitCoverage }) {
  if (coverage.facility.hasClearDamageSplit && coverage.inspector.hasClearDamageSplit) {
    return null;
  }

  const missingFacilityFields = coverage.facility.missingSourceFields;
  const missingInspectorFields = coverage.inspector.missingSourceFields;
  const hasFacilityRows = coverage.facility.hasRows;
  const hasInspectorRows = coverage.inspector.hasRows;
  const facilityStatus = !hasFacilityRows
    ? "No byFacilityDaily data returned"
    : coverage.facility.hasClearDamageSplit
      ? `Facility rows with clear/damaged split: ${coverage.facility.splitRows}`
      : "Facility rows are not returning both clear and damaged split fields";
  const inspectorStatus = !hasInspectorRows
    ? "No byInspectorDaily data returned"
    : coverage.inspector.hasClearDamageSplit
      ? `Inspector rows with clear/damaged split: ${coverage.inspector.splitRows}`
      : "Inspector rows are not returning both clear and damaged split fields";

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-semibold">Analytics split data is incomplete</p>
      <p className="mt-1">
        Home analytics is loading from <span className="font-mono">{coverage.endpoint}</span> and can show clear/damaged breakdowns only if each
        daily row includes both values.
      </p>
      <p className="mt-1 text-[12px]">{facilityStatus}.</p>
      <p className="mt-0.5 text-[12px]">{inspectorStatus}.</p>
      <p className="mt-2 text-[12px]">
        Backend daily payload should include these row shapes:
      </p>
      <p className="mt-1 text-[12px]">
        <span className="font-semibold">byFacilityDaily</span> rows:
        <span className="font-mono"> {ANALYTICS_DAILY_FACILITY_REQUIREMENTS.join(" | ")} </span>
      </p>
      <p className="mt-0.5 text-[12px]">
        <span className="font-semibold">byInspectorDaily</span> rows:
        <span className="font-mono"> {ANALYTICS_DAILY_INSPECTOR_REQUIREMENTS.join(" | ")} </span>
      </p>
      {!coverage.facility.hasClearDamageSplit ? (
        <p className="mt-2">
          Expected facility fields:
          <span className="font-mono"> {missingFacilityFields.join(", ") || "damageReports and noDamageReports (or aliases)"} </span>
        </p>
      ) : null}
      {!coverage.inspector.hasClearDamageSplit ? (
        <p className="mt-1">
          Expected inspector fields:
          <span className="font-mono"> {missingInspectorFields.join(", ") || "damageReports and noDamageReports (or aliases)"} </span>
        </p>
      ) : null}
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

export default function HomePage() {
  const { organizationId, session } = usePortalSession();
  const { data: directory, isLoading, error } = usePortalDirectorySnapshot();
  const [devStatsCopyStatus, setDevStatsCopyStatus] = useState<"idle" | "copied" | "failed">("idle");
  const [showDevStatsCopyButton, setShowDevStatsCopyButton] = useState(process.env.NODE_ENV !== "production");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState(organizationId ?? "");
  const [selectedFacilityKey, setSelectedFacilityKey] = useState("all");
  const [selectedSeverityLevel, setSelectedSeverityLevel] = useState("all");
  const [selectedDamageAreaFilter, setSelectedDamageAreaFilter] = useState("");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [reportIdFilter, setReportIdFilter] = useState("");
  const [vinFilter, setVinFilter] = useState("");
  const [inspectionTypeFilter, setInspectionTypeFilter] = useState("");
  const [inspectionTypeSearch, setInspectionTypeSearch] = useState("");
  const [inspectionTypeSuggestionsOpen, setInspectionTypeSuggestionsOpen] = useState(false);
  const [makeFilter, setMakeFilter] = useState("");
  const [modelFilter, setModelFilter] = useState("");
  const [yardFilter, setYardFilter] = useState("");
  const [inspectorEmailFilter, setInspectorEmailFilter] = useState("");
	  const [statusFilter, setStatusFilter] = useState("");
  const [vinSheetExporting, setVinSheetExporting] = useState(false);
	  const homeCountMode: HomeCountMode = "reports";
  const [homeFilterMenuOpen, setHomeFilterMenuOpen] = useState(false);
  const [activeHomeFilterKeys, setActiveHomeFilterKeys] = useState<HomeFilterKey[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLocalDebugHost(window.location.hostname)) {
      setShowDevStatsCopyButton(true);
    }
  }, []);

  const analyticsParams = useMemo(
    () => ({
      facility_id:
        selectedFacilityKey !== "all" && selectedFacilityKey !== "other" && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(selectedFacilityKey)
          ? selectedFacilityKey
          : undefined,
      from: createdFrom || undefined,
      to: createdTo || undefined,
      inspection_type: inspectionTypeFilter || undefined,
      status: statusFilter || undefined,
      inspector_email: inspectorEmailFilter || undefined,
      report_id: reportIdFilter || undefined,
      vin: vinFilter || undefined,
      make: makeFilter || undefined,
      model: modelFilter || undefined,
      yard: yardFilter || undefined,
      severity: selectedSeverityLevel !== "all" ? selectedSeverityLevel : undefined,
      damage_area: selectedDamageAreaFilter || undefined,
    }),
    [createdFrom, createdTo, inspectionTypeFilter, inspectorEmailFilter, makeFilter, modelFilter, reportIdFilter, selectedDamageAreaFilter, selectedFacilityKey, selectedSeverityLevel, statusFilter, vinFilter, yardFilter]
  );
  const {
    data: baseAnalyticsSnapshot,
    isValidating: baseAnalyticsValidating,
  } = useDashboardAnalyticsSnapshot();
  const {
    data: analyticsSnapshot,
    error: analyticsError,
    isLoading: analyticsLoading,
    isValidating: analyticsValidating,
    hasCachedData: analyticsHasCachedData,
  } = useDashboardAnalyticsSnapshot(analyticsParams);

  const facilities = useMemo(() => directory?.facilities ?? [], [directory]);
  const facilitySource = facilities.length > 0 ? facilities : undefined;
  const dashboardAnalytics = analyticsSnapshot as DashboardAnalyticsPayload | undefined;
  const analyticsErrorMessage = analyticsError instanceof Error ? analyticsError.message : analyticsError ? String(analyticsError) : null;
  const analyticsHasUsableData = Boolean(dashboardAnalytics);
  const analyticsRefreshInProgress = Boolean(analyticsHasUsableData && (analyticsValidating || baseAnalyticsValidating));
  const reportsLoading = analyticsLoading;
  const reportsError = analyticsError;
  const activeInspectionTypeOptions = useMemo(
    () =>
      (dashboardAnalytics?.byInspectionType ?? [])
        .map((item) => ({
          number: String((item as Record<string, unknown>).number ?? (item as Record<string, unknown>).inspection_type_number ?? ""),
          label: String((item as Record<string, unknown>).label ?? (item as Record<string, unknown>).inspection_type_label ?? ""),
          displayLabel: String((item as Record<string, unknown>).displayLabel ?? (item as Record<string, unknown>).label ?? ""),
        }))
        .filter((item) => item.number || item.label),
    [dashboardAnalytics?.byInspectionType]
  );
  const filteredInspectionTypeOptions = useMemo(() => {
    const query = inspectionTypeSearch.trim().toLowerCase();
    if (!query) return activeInspectionTypeOptions;
    return activeInspectionTypeOptions.filter((option) =>
      `${option.number} ${option.label} ${option.displayLabel}`.toLowerCase().includes(query)
    );
  }, [activeInspectionTypeOptions, inspectionTypeSearch]);
	  const homeFilters = useMemo(
	    () => ({
	      ...DEFAULT_DAMAGE_REPORT_FILTERS,
	      facilityFilter: selectedFacilityKey,
      reportIdFilter,
      vinFilter,
      inspectionTypeFilter,
      makeFilter,
      modelFilter,
      yardFilter,
      inspectorEmailFilter,
      statusFilter: statusFilter as "" | import("@/lib/types").ReportStatus,
      createdFrom,
      createdTo,
	    }),
	    [createdFrom, createdTo, inspectorEmailFilter, inspectionTypeFilter, makeFilter, modelFilter, reportIdFilter, selectedFacilityKey, statusFilter, vinFilter, yardFilter]
	  );
  const exportFilterBundle = useMemo(
    () =>
      normalizeHomeReportFiltersForExport({
        selectedFacilityKey,
        reportIdFilter,
        vinFilter,
        inspectionTypeFilter,
        makeFilter,
        modelFilter,
        yardFilter,
        inspectorEmailFilter,
        statusFilter,
        createdFrom,
        createdTo,
      }),
    [createdFrom, createdTo, inspectorEmailFilter, inspectionTypeFilter, makeFilter, modelFilter, reportIdFilter, selectedFacilityKey, statusFilter, vinFilter, yardFilter]
  );
  const reportListParams = useMemo<ReportListParams>(
    () => ({
      page: 1,
      pageSize: 50,
      limit: 50,
      sort: "created_at_desc",
      facility_id:
        selectedFacilityKey !== "all" && selectedFacilityKey !== "other" && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(selectedFacilityKey)
          ? selectedFacilityKey
          : undefined,
      from: createdFrom || undefined,
      to: createdTo || undefined,
      inspection_type: inspectionTypeFilter || undefined,
      status: statusFilter || undefined,
      inspector_email: inspectorEmailFilter || undefined,
      report_id: reportIdFilter || undefined,
      vin: vinFilter || undefined,
      make: makeFilter || undefined,
      model: modelFilter || undefined,
      yard: yardFilter || undefined,
      severity: selectedSeverityLevel !== "all" ? selectedSeverityLevel : undefined,
      damage_area: selectedDamageAreaFilter || undefined,
    }),
    [createdFrom, createdTo, inspectionTypeFilter, inspectorEmailFilter, makeFilter, modelFilter, reportIdFilter, selectedDamageAreaFilter, selectedFacilityKey, selectedSeverityLevel, statusFilter, vinFilter, yardFilter]
  );
  const {
    data: reportListSnapshot,
    error: reportListError,
    isLoading: reportListLoading,
    isValidating: reportListValidating,
  } = useReportListSnapshot(reportListParams);
	  const facilityDamageStats = useMemo(
	    () =>
	      (baseAnalyticsSnapshot?.byFacility ?? baseAnalyticsSnapshot?.facilities ?? dashboardAnalytics?.byFacility ?? dashboardAnalytics?.facilities ?? [])
        .map((item) => normalizeAnalyticsFacility(item as Record<string, unknown>))
        .sort((a, b) => b.totalReports - a.totalReports),
    [baseAnalyticsSnapshot?.byFacility, baseAnalyticsSnapshot?.facilities, dashboardAnalytics?.byFacility, dashboardAnalytics?.facilities]
  );
	  const selectedSeverityNumber = selectedSeverityLevel === "all" ? null : Number(selectedSeverityLevel);
	  const selectedSeverityFilter = Number.isFinite(selectedSeverityNumber) ? selectedSeverityNumber : null;
  const previewInspectionReports = useMemo(
    () =>
      filterHomeInspectionReports(
        normalizeReportListRows(reportListSnapshot?.rows ?? []).map(normalizedRowToDamageReport),
        exportFilterBundle,
        selectedSeverityFilter,
        selectedDamageAreaFilter
      ),
    [exportFilterBundle, reportListSnapshot?.rows, selectedDamageAreaFilter, selectedSeverityFilter]
  );
  const previewOutcomeCounts = useMemo(
    () => buildInspectionOutcomeCounts(previewInspectionReports),
    [previewInspectionReports]
  );
  const reportListErrorMessage =
    reportListError instanceof Error ? reportListError.message : reportListError ? String(reportListError) : null;
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
  const sanitizeFacilityDisplay = (value: string): string => normalizeFacilityDisplayLabel(value);
  const sanitizeDisplay = (value: string): string => stripFacilitySuffix(value);
  const availableHomeFilterOptions = DAMAGE_FILTER_OPTIONS.filter(
    (option): option is (typeof DAMAGE_FILTER_OPTIONS)[number] & { key: HomeFilterKey } =>
      HOME_FILTER_KEYS.includes(option.key as HomeFilterKey)
  );
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
    setInspectionTypeSearch("");
    setInspectionTypeSuggestionsOpen(false);
    setMakeFilter("");
    setModelFilter("");
    setYardFilter("");
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
    if (key === "inspection_type") {
      return (
        <div className="relative w-96">
          <input
            type="search"
            placeholder="Type inspection number or name"
            value={inspectionTypeSearch}
            onChange={(e) => {
              const nextSearch = e.target.value;
              setInspectionTypeSearch(nextSearch);
              setInspectionTypeSuggestionsOpen(Boolean(nextSearch.trim()));
              if (!nextSearch.trim()) {
                setInspectionTypeFilter("");
              }
            }}
            onFocus={() => setInspectionTypeSuggestionsOpen(Boolean(inspectionTypeSearch.trim()))}
            onBlur={() => {
              window.setTimeout(() => setInspectionTypeSuggestionsOpen(false), 120);
            }}
            className="h-8 w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300"
          />
          {inspectionTypeSuggestionsOpen && inspectionTypeSearch.trim() ? (
            <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.14)]">
              <div className="max-h-64 overflow-auto py-1">
                {filteredInspectionTypeOptions.length > 0 ? (
                  filteredInspectionTypeOptions.map((option) => (
                    <button
                      key={option.number}
                      type="button"
                      onClick={() => {
                        setInspectionTypeFilter(option.number);
                        setInspectionTypeSearch(`${option.number} - ${option.label}`);
                        setInspectionTypeSuggestionsOpen(false);
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm text-slate-900 transition hover:bg-slate-100"
                    >
                      <span className="font-semibold text-slate-900">{option.number}</span>
                      <span className="min-w-0 flex-1 truncate text-right text-slate-600">{option.label}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-slate-500">No matching inspection type.</div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      );
    }
    if (key === "make") {
      return <input type="search" placeholder="Make" value={makeFilter} onChange={(e) => setMakeFilter(e.target.value)} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />;
    }
    if (key === "model") {
      return <input type="search" placeholder="Model" value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />;
    }
    if (key === "yard") {
      return <input type="search" placeholder="Yard" value={yardFilter} onChange={(e) => setYardFilter(e.target.value)} className="h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300" />;
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
  }, [selectedOrganizationId]);

	  const inspectorChoices = useMemo(
	    () => buildAnalyticsInspectorSummaries(dashboardAnalytics, homeCountMode),
	    [dashboardAnalytics, homeCountMode]
	  );

  const modelOptions = useMemo(
    () => {
      const optionsByValue = new Map<string, { value: string; label: string; count: number }>();
      for (const item of dashboardAnalytics?.byInspectionType ?? []) {
        const record = item as Record<string, unknown>;
        const value = String(record.number ?? record.inspection_type_number ?? record.label ?? "").trim();
        if (!value) continue;
        const label = String(record.label ?? record.inspection_type_label ?? value).trim() || value;
        const count = Number(record.count ?? 0);
        const existing = optionsByValue.get(value);
        if (existing) {
          existing.count += Number.isFinite(count) ? count : 0;
          if (existing.label === value && label !== value) {
            existing.label = label;
          }
        } else {
          optionsByValue.set(value, {
            value,
            label,
            count: Number.isFinite(count) ? count : 0,
          });
        }
      }
      return Array.from(optionsByValue.values()).sort((left, right) => left.value.localeCompare(right.value));
    },
    [dashboardAnalytics?.byInspectionType]
  );
  const [selectedModelFilter, setSelectedModelFilter] = useState("all");
  useEffect(() => {
    if (selectedModelFilter === "all") {
      return;
    }
    if (!modelOptions.some((option) => option.value === selectedModelFilter)) {
      setSelectedModelFilter("all");
    }
  }, [modelOptions, selectedModelFilter]);
  const filteredFacilityStats = useMemo(
    () =>
      (dashboardAnalytics?.byFacility ?? dashboardAnalytics?.facilities ?? [])
        .map((item) => normalizeAnalyticsFacility(item as Record<string, unknown>))
        .filter((facility) => isHomeVisibleFacility(facility.label))
        .sort((a, b) => b.totalReports - a.totalReports),
    [dashboardAnalytics?.byFacility, dashboardAnalytics?.facilities]
  );
  const homeFacilityFilterOptions = useMemo(
    () => facilityDamageStats.filter((stats) => isHomeVisibleFacility(stats.label)),
    [facilityDamageStats]
  );
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
                reportCount: buildTrendBreakdownForPair(inspector.damageCount ?? 0, inspector.clearCount ?? 0),
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
      selectedOrgId: selectedOrganizationId,
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
    selectedOrganizationId,
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
		  const isDamageCountMode = false;
	  const countNoun = "damage submissions";
	  const countNounTitle = "Damage Submissions";
  const hasBackendClearReports = Boolean(
    dashboardAnalytics?.totals &&
      ("noDamageReports" in dashboardAnalytics.totals ||
        "noDamageCount" in dashboardAnalytics.totals ||
        "noDamageScans" in dashboardAnalytics.totals)
  );
  const damageInspectionCount = summary.totals.damageReports || previewOutcomeCounts.damageCount;
  const clearInspectionCount = hasBackendClearReports ? summary.totals.noDamageReports : previewOutcomeCounts.clearCount;
  const totalDamageSubmissionCount =
    damageInspectionCount + clearInspectionCount ||
    previewOutcomeCounts.inspectionCount;
	  const primaryDamageTotal = damageInspectionCount;
	  const primaryDamageToday = summary.currentPeriod.damageToday;
	  const primaryDamageMonthToDate = summary.currentPeriod.damageMonthToDate;
	  const totalReportsDetail = `Damaged ${formatNumber(damageInspectionCount)} · Clear ${formatNumber(clearInspectionCount)} · RSA separate ${formatNumber(summary.totals.rsaReports)}`;
	  const severityPieData = useMemo(
	    () =>
	      buildSelectedSeverityPieData(chartSummary.severity as DashboardSeverityItem[], selectedSeverityLevel).map((item) => {
	        const level = Number(String(item.name).split(" - ")[0]);
	        const matchingReports = Number.isFinite(level)
	          ? previewInspectionReports.filter((report) => reportMatchesSeverityFilter(report, level))
	          : [];
	        const counts = matchingReports.length ? buildInspectionOutcomeCounts(matchingReports) : null;
	        return {
	          ...item,
	          breakdown: [],
	          inspectionCount: counts?.inspectionCount ?? item.count,
	          damageCount: counts?.damageCount ?? item.count,
	          clearCount: counts?.clearCount ?? 0,
	          vinSamples: counts?.vinSamples ?? [],
	        };
	      }),
	    [chartSummary.severity, previewInspectionReports, selectedSeverityLevel]
	  );
  const visibleSeverityPieData = useMemo(
    () => severityPieData.filter((item) => Number(item.count) > 0),
    [severityPieData]
  );
  const severityFooterRows = useMemo(
    () => buildSeverityTotalRows(chartSummary.severity as DashboardSeverityItem[]),
    [chartSummary.severity]
  );
  const areaCounts = useMemo(
    () => new Map((chartSummary.topAreas ?? []).map((item) => [item.name, item.count] as const)),
    [chartSummary.topAreas]
  );
	  const areaPieData = useMemo(
	    () =>
	      buildSelectedAreaPieData([...areaCounts.entries()].map(([name, count]) => ({ name, count })), selectedDamageAreaFilter).map((item) => {
	        const matchingReports = previewInspectionReports.filter((report) => reportMatchesDamageAreaFilter(report, item.name));
	        const counts = matchingReports.length ? buildInspectionOutcomeCounts(matchingReports) : null;
	        return {
	          ...item,
	          inspectionCount: counts?.inspectionCount ?? item.count,
	          damageCount: counts?.damageCount ?? item.count,
	          clearCount: counts?.clearCount ?? 0,
	          vinSamples: counts?.vinSamples ?? [],
	        };
	      }),
	    [areaCounts, previewInspectionReports, selectedDamageAreaFilter]
	  );
  const visibleAreaPieData = useMemo(
    () => areaPieData.filter((item) => Number(item.count) > 0),
    [areaPieData]
  );
  const allAreaRows = useMemo(
    () => [...areaCounts.entries()].map(([name, count]) => ({ name, count })),
    [areaCounts]
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
    () => clampDateRangeToThirtyDays(createdFrom || null, createdTo || dashboardAnalytics?.range?.to || null, safeDate(reportDateBounds.maxDate)),
    [createdFrom, createdTo, dashboardAnalytics?.range?.to, reportDateBounds.maxDate]
  );
  const analyticsSplitCoverage = useMemo(
    () => buildDashboardDailySplitCoverage(dashboardAnalytics, homeCountMode),
    [dashboardAnalytics, homeCountMode]
  );
  const facilityTrend = useMemo(() => {
    const trend = buildDailyAnalyticsTrend(dashboardAnalytics, facilityTrendRange, homeCountMode);
    const colors = buildFacilityColorMap(trend.keys);
    return {
      source: trend.source,
      hasClearDamageSplit: trend.hasClearDamageSplit,
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
      facilityTrendRange
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
      hasClearDamageSplit: trend.hasClearDamageSplit,
      range: {
        from: toDateInputValue(facilityTrendRange.start),
        to: toDateInputValue(facilityTrendRange.end),
        days: daysBetween(facilityTrendRange.start, facilityTrendRange.end) + 1,
      },
      inspectors: keys,
      colors: buildFacilityColorMap(keys),
      rows,
      hasDailyData: rows.some((row) => keys.some((key) => Number(row[key] ?? 0) > 0)),
    };
  }, [dashboardAnalytics, facilityTrendRange, homeCountMode]);
  const devStatsPayload = useMemo(
    () => ({
      capturedAt: new Date().toISOString(),
      route: "/home",
      purpose: "Compact visual data audit. Each section below maps to one visible home dashboard visual.",
      filters: {
        organizationId,
        selectedOrganizationId,
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
	        reportListEndpoint: "/reports/list",
	        note: "Home summary charts come from /api/dashboard/analytics; the VIN sheet preview and VIN exports use /reports/list.",
	      },
	      sourceCounts: {
	        analyticsFacilityRows: (dashboardAnalytics?.byFacility ?? dashboardAnalytics?.facilities ?? []).length,
	        reportListPreviewRows: previewInspectionReports.length,
	        reportListTotal: reportListSnapshot?.total ?? null,
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
        rsa: {
          route: "/reports/rsa/",
          source: "not loaded by /home dump; open /reports/rsa/ for RSA rows",
          overview: buildRsaReportsDebugOverview([]),
        },
      },
      cards: [
        {
          label: "Damage Reports Today",
          value: summary.currentPeriod.damageToday,
          detail: `Total reports today ${formatNumber(summary.currentPeriod.reportsToday)}`,
        },
        {
          label: "Total RSA",
          value: summary.totals.rsaReports,
          detail: `Today ${formatNumber(summary.currentPeriod.rsaToday)}`,
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
          title: `Daily ${countNounTitle}`,
          source: facilityTrend.source,
          range: facilityTrend.range,
          series: facilityTrend.facilities,
          colors: facilityTrend.colors,
          rowCount: facilityTrend.rows.length,
          rows: facilityTrend.rows,
        },
        inspectorDailyBarChart: {
          title: `Daily Inspector ${countNounTitle}`,
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
            breakdown: slice.breakdown ?? [],
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
	        reportListPreviewRows: previewInspectionReports.length,
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
	      isDamageCountMode,
	      isLoading,
		      organizationId,
      previewInspectionReports.length,
      reportListSnapshot?.total,
	      selectedDamageAreaFilter,
      selectedFacilityKey,
      selectedOrganizationId,
      selectedSeverityLevel,
      severityFooterRows,
      visibleAreaPieData,
      visibleSeverityPieData,
      summary.currentPeriod.damageMonthToDate,
      summary.currentPeriod.damageToday,
      summary.currentPeriod.reportsToday,
      summary.currentPeriod.rsaToday,
      summary.totals.damageReports,
      summary.totals.facilities,
      summary.totals.rsaReports,
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
  const selectedFacilityExportLabel =
    selectedFacilityKey === "all"
      ? "All facilities"
      : homeFacilityFilterOptions.find((stats) => stats.key === selectedFacilityKey)?.label ?? selectedFacilityKey;
  const selectedSeverityExportLabel =
    selectedSeverityLevel === "all"
      ? "All severities"
      : DAMAGE_SEVERITIES.find((option) => option.value === selectedSeverityLevel)?.label ?? selectedSeverityLevel;
  const selectedCardInspectionTypeLabel =
    selectedModelFilter === "all"
      ? "All inspection types"
      : modelOptions.find((option) => option.value === selectedModelFilter)?.label ?? selectedModelFilter;
  const buildDashboardFilterRows = (): unknown[][] => [
    ["Organization", sanitizeDisplay(currentOrganizationLabel)],
    ["Organization ID", selectedOrganizationId || organizationId || ""],
    ["Facility", sanitizeFacilityDisplay(selectedFacilityExportLabel)],
    ["Severity", selectedSeverityExportLabel],
    ["Damage Area", selectedDamageAreaFilter || "All damage areas"],
    ["Date From", createdFrom || "All dates"],
    ["Date To", createdTo || "All dates"],
    ["Report ID", reportIdFilter || "All reports"],
    ["VIN", vinFilter || "All VINs"],
    ["Inspection Type", inspectionTypeSearch || inspectionTypeFilter || "All inspection types"],
    ["Make", makeFilter || "All makes"],
    ["Model", modelFilter || "All models"],
    ["Yard", yardFilter || "All yards"],
    ["Inspector", inspectorEmailFilter || "All inspectors"],
    ["Status", statusFilter || "All statuses"],
  ];
  const buildExportSummaryRows = (context: ExportCardContext, reports: ReportDamageApiRow[], warning?: string): unknown[][] => {
    const outcomeCounts = buildInspectionOutcomeCounts(reports);
    return [
      ["Inspection Trac Analytics Export"],
      ["Export", context.title],
      ["Generated At", new Date().toISOString()],
      ["Rows Exported", reports.length],
      ["Entries Count", countDamageEntries(reports)],
      ["Damage Submission Count", outcomeCounts.inspectionCount],
      ["Damaged Submissions", outcomeCounts.damageCount],
      ["Clear Submissions", outcomeCounts.clearCount],
      ["Unknown Submissions", outcomeCounts.unknownCount],
      ...(warning ? [["Export Warning", warning]] : []),
      [],
      ["Dashboard Filters"],
      ["Filter", "Value"],
      ...buildDashboardFilterRows(),
      [],
      ["Card Filters"],
      ["Filter", "Value"],
      ...(context.cardFilters?.length ? context.cardFilters : [["Card", "Current dashboard selection"]]),
    ];
  };
  const addCsvToZip = (zip: JSZip, filename: string, rows: unknown[][]) => {
    zip.file(filename, `\uFEFF${csvRowsToText(rows)}`);
  };
  const buildClaimsManifest = (context: ExportCardContext, reports: ReportDamageApiRow[], warning?: string) => {
    const outcomeCounts = buildInspectionOutcomeCounts(reports);
    return {
      title: context.title,
      generatedAt: new Date().toISOString(),
      organization: {
        name: sanitizeDisplay(currentOrganizationLabel),
        id: selectedOrganizationId || organizationId || "",
      },
      counts: {
        rowsExported: reports.length,
        entriesCount: countDamageEntries(reports),
        damageSubmissionCount: outcomeCounts.inspectionCount,
        damagedSubmissions: outcomeCounts.damageCount,
        clearSubmissions: outcomeCounts.clearCount,
        unknownSubmissions: outcomeCounts.unknownCount,
        vins: new Set(reports.map((report) => (report.vin ?? "").trim().toUpperCase()).filter(Boolean)).size,
      },
      filters: Object.fromEntries(buildDashboardFilterRows().map(([key, value]) => [String(key), value])),
      cardFilters: Object.fromEntries((context.cardFilters ?? [["Card", "Current dashboard selection"]]).map(([key, value]) => [String(key), value])),
      warning: warning || null,
      files: [
        "README.txt",
        "manifest.json",
        "summary.csv",
        "vin-sheet.csv",
        "damage-entries.csv",
        "media-links.csv",
        ...(context.cardRows?.length ? ["sections/card-data.csv"] : []),
        ...(context.cardFiles ?? []).map((file) => `sections/${sanitizeFileNameSegment(file.filename.replace(/\.csv$/i, ""), "section")}.csv`),
        "submissions/*/submission.csv",
        "submissions/*/submission.json",
        "submissions/*/damage-entries.csv",
      ],
    };
  };
  const buildClaimsReadme = (context: ExportCardContext, reports: ReportDamageApiRow[], warning?: string): string => {
    const outcomeCounts = buildInspectionOutcomeCounts(reports);
    return [
      "Inspection Trac Claims Export",
      "",
      `Export: ${context.title}`,
      `Generated: ${new Date().toISOString()}`,
      `Organization: ${sanitizeDisplay(currentOrganizationLabel)}`,
      `Rows exported: ${reports.length}`,
      `Entries count: ${countDamageEntries(reports)}`,
      `Damaged submissions: ${outcomeCounts.damageCount}`,
      `Clear submissions: ${outcomeCounts.clearCount}`,
      warning ? `Warning: ${warning}` : "",
      "",
      "Files:",
      "- summary.csv: organization, active dashboard filters, card filters, and total counts.",
      "- vin-sheet.csv: one row per damage submission/VIN in this export.",
      "- damage-entries.csv: one row per damage entry across exported submissions.",
      "- media-links.csv: PDF, photo, and splat links by submission.",
      "- sections/*.csv: the visible chart or table data for the export button used.",
      "- submissions/*: per-submission CSV detail, raw JSON, and damage-entry CSV where applicable.",
      "",
      "Media files are included as links. Embedding the actual photos/PDF binaries needs backend signed URLs that allow browser fetches or a backend ZIP endpoint.",
    ]
      .filter((line) => line !== "")
      .join("\n");
  };
  const buildClaimsZip = async (context: ExportCardContext, reports: ReportDamageApiRow[], warning?: string): Promise<Blob> => {
    const zip = new JSZip();
    zip.file("README.txt", buildClaimsReadme(context, reports, warning));
    zip.file("manifest.json", JSON.stringify(buildClaimsManifest(context, reports, warning), null, 2));
    addCsvToZip(zip, "summary.csv", buildExportSummaryRows(context, reports, warning));
    addCsvToZip(zip, "vin-sheet.csv", buildInspectionVinSheetRows(reports));
    addCsvToZip(zip, "damage-entries.csv", buildDamageEntriesSheetRows(reports));
    addCsvToZip(zip, "media-links.csv", buildMediaLinksSheetRows(reports));
    if (context.cardRows?.length) {
      addCsvToZip(zip, "sections/card-data.csv", context.cardRows);
    }
    for (const file of context.cardFiles ?? []) {
      addCsvToZip(zip, `sections/${sanitizeFileNameSegment(file.filename.replace(/\.csv$/i, ""), "section")}.csv`, file.rows);
    }
    reports.forEach((report, index) => {
      const indexSegment = String(index + 1).padStart(4, "0");
      const reportSegment = sanitizeFileNameSegment(report.report_id, "report");
      const vinSegment = sanitizeFileNameSegment(report.vin || "no-vin", "no-vin");
      const folder = `submissions/${indexSegment}-${reportSegment}-${vinSegment}`;
      addCsvToZip(zip, `${folder}/submission.csv`, buildSubmissionDetailRows(report));
      zip.file(`${folder}/submission.json`, JSON.stringify(report, null, 2));
      if (getDamageEntryCount(report) > 0) {
        addCsvToZip(zip, `${folder}/damage-entries.csv`, buildDamageEntriesSheetRows([report]));
      }
    });
    return zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });
  };
  const loadAllFilteredInspectionReports = async (context: ExportCardContext): Promise<ReportDamageApiRow[]> => {
    const reports = await fetchDamageReportListSnapshot({
      ...reportListParams,
      page: 1,
      pageSize: 100,
      limit: 100,
      sort: "created_at_desc",
    });
    const filtered = filterHomeInspectionReports(
      reports,
      exportFilterBundle,
      selectedSeverityFilter,
      selectedDamageAreaFilter
    );
    return context.filterReport ? filtered.filter(context.filterReport) : filtered;
  };
  const exportInspectionVinSheet = async (context: ExportCardContext) => {
    setVinSheetExporting(true);
    try {
      const reports = await loadAllFilteredInspectionReports(context);
      const blob = await buildClaimsZip(context, reports);
      downloadBlob(`${context.filenamePrefix}-${exportTimestamp()}.zip`, blob);
    } catch (exportError) {
      console.warn("[home.export] unable to fetch complete VIN export", exportError);
      const warning =
        exportError instanceof Error
          ? exportError.message
          : "Unable to fetch every matching report row; exported the loaded preview rows instead.";
      const fallbackRows = context.filterReport ? previewInspectionReports.filter(context.filterReport) : previewInspectionReports;
      const blob = await buildClaimsZip(context, fallbackRows, warning);
      downloadBlob(`${context.filenamePrefix}-preview-${exportTimestamp()}.zip`, blob);
    } finally {
      setVinSheetExporting(false);
    }
  };
  const buildAllClaimsSectionFiles = (): NonNullable<ExportCardContext["cardFiles"]> => [
    {
      filename: "daily-damage-submission-analytics.csv",
      rows: [
        ["Date", ...facilityTrend.facilities],
        ...facilityTrend.rows.map((row) => [
          row.date,
          ...facilityTrend.facilities.map((series) => String(row[series] ?? 0)),
        ]),
      ],
    },
    {
      filename: "facility-damage-submission-counts.csv",
      rows: [
        ["Facility", "Damage Submissions", "Damaged Submissions", "Entries Count", "RSA Reports", "VINs"],
        ...filteredFacilityStats.map((facility) => [
          sanitizeFacilityDisplay(facility.label),
          isDamageCountMode ? facility.entries : facility.damageReports,
          facility.damageReports,
          facility.entries,
          facility.rsaReports,
          facility.vins,
        ]),
      ],
    },
    {
      filename: "inspector-damage-submission-counts.csv",
      rows: [
        ["Inspector", "Email", countNounTitle],
        ...inspectorChartRows.map((item) => [item.label, item.email, item.reportCount]),
      ],
    },
    {
      filename: inspectorTrend.hasDailyData ? "daily-inspector-damage-submissions.csv" : "inspector-damage-submissions.csv",
      rows: inspectorTrend.hasDailyData
        ? [
            ["Date", ...inspectorTrend.inspectors],
            ...inspectorTrend.rows.map((row) => [
              row.date,
              ...inspectorTrend.inspectors.map((series) => String(row[series] ?? 0)),
            ]),
          ]
        : [
            ["Inspector", "Email", countNounTitle],
            ...inspectorChartRows.map((item) => [item.label, item.email, String(item.reportCount)]),
          ],
    },
    {
      filename: "severity-damage-submission-detail.csv",
      rows: [
        ["Severity", "Damage Submissions", "Damaged Submissions", "Clear Submissions", "Entries Count", "VIN Samples"],
        ...visibleSeverityPieData.map((slice) => [
          slice.name,
          slice.inspectionCount ?? slice.count,
          slice.damageCount ?? slice.count,
          slice.clearCount ?? 0,
          slice.damageCount ?? slice.count,
          (slice.vinSamples ?? []).join(" | "),
        ]),
      ],
    },
    {
      filename: "damage-area-submission-detail.csv",
      rows: [
        ["Damage Area", "Damage Submissions", "Damaged Submissions", "Clear Submissions", "Entries Count", "VIN Samples"],
        ...visibleAreaPieData.map((slice) => [
          slice.name,
          slice.inspectionCount ?? slice.count,
          slice.damageCount ?? slice.count,
          slice.clearCount ?? 0,
          slice.damageCount ?? slice.count,
          (slice.vinSamples ?? []).join(" | "),
        ]),
      ],
    },
    {
      filename: "loaded-vin-preview.csv",
      rows: buildInspectionVinSheetRows(previewInspectionReports),
    },
  ];

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
      setSelectedFacilityKey(matched.key);
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
          {showDevStatsCopyButton ? (
            <div className="fixed right-4 top-4 z-[80] flex items-center gap-2">
              <button
                type="button"
                onClick={downloadDevStatsPayload}
                className="inline-flex h-9 items-center rounded-lg border border-slate-900 bg-white px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 shadow-lg transition hover:bg-slate-100"
                title="Download a JSON dump of the local portal data behind home, damage, and RSA views."
              >
                Download data dump
              </button>
              <button
                type="button"
                onClick={() => void copyDevStatsPayload()}
                className="inline-flex h-9 items-center rounded-lg border border-slate-900 bg-white px-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-950 shadow-lg transition hover:bg-slate-100"
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
          <AnalyticsSplitCoverageAlert coverage={analyticsSplitCoverage} />
          <Card className="sticky top-0 z-30 overflow-visible border-slate-200/80 bg-white/95 shadow-[0_18px_60px_-34px_rgba(15,23,42,0.25)] backdrop-blur">
            <CardHeader
              title="Filters"
              subtitle="Filters scope the damage submissions analytics; RSA counts stay separate."
		              actions={
		                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void exportInspectionVinSheet({
                        filenamePrefix: "claims-all-sections",
                        title: "All Visible Analytics Sections",
                        cardFilters: [["Package", "All visible dashboard sections"]],
                        cardFiles: buildAllClaimsSectionFiles(),
                      })
                    }
                    disabled={vinSheetExporting}
                    className="inline-flex h-8 items-center gap-2 rounded-lg border border-black bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black shadow-sm transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
                  >
                    <Download className="h-4 w-4" />
                    {vinSheetExporting ? "Exporting" : "Export all ZIP"}
                  </button>
		                  <button
		                    type="button"
		                    onClick={clearHomeFilters}
                    className="inline-flex h-8 items-center rounded-lg border border-black bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black shadow-sm transition hover:bg-slate-50"
                  >
                    Clear filters
                  </button>
                  <DropdownMenu open={homeFilterMenuOpen} onOpenChange={setHomeFilterMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-black bg-white px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-black shadow-sm transition hover:bg-slate-100 aria-expanded:bg-slate-900 aria-expanded:text-white"
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
                      {homeFacilityFilterOptions.map((stats) => (
                        <option key={stats.key} value={stats.key}>
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

          <div className="grid gap-4 xl:items-stretch">
	            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
                <MetricCard label="Total Damage Submissions" value={totalDamageSubmissionCount} detail={totalReportsDetail} icon={<FileText className="h-4 w-4" />} />
                <MetricCard accent label="Damaged Submissions Today" value={primaryDamageToday} detail={`Clear submissions today ${formatNumber(Math.max(summary.currentPeriod.reportsToday - primaryDamageToday, 0))}`} icon={<TriangleAlert className="h-4 w-4" />} />
                <MetricCard
                  label="Damage vs Clear"
                  value={<ClearDamageMetricValue damageCount={primaryDamageTotal} clearCount={clearInspectionCount} />}
                  detail={
                    hasBackendClearReports
                      ? "From /api/dashboard/analytics totals"
                      : "Clear count falls back to loaded VIN preview"
                  }
                  icon={<FileText className="h-4 w-4" />}
                />
                <MetricCard label="RSA Reports" value={summary.totals.rsaReports} detail={`RSA today ${formatNumber(summary.currentPeriod.rsaToday)}`} icon={<FileText className="h-4 w-4" />} />
                <MetricCard label="Active Facilities" value={summary.totals.facilities} detail="Facilities in filtered damage submissions" icon={<Filter className="h-4 w-4" />} />
                <MetricCard label="Unique Inspectors" value={inspectorChoices.length} detail="Inspectors in filtered damage submissions" icon={<FileText className="h-4 w-4" />} />
              </div>

	              <div className="grid gap-4 xl:grid-cols-1">
	                <Card className="overflow-hidden">
	                  <CardHeader
		                    title={`Daily ${countNounTitle}`}
		                    subtitle={`30-day analytics trend ending ${formatDateKeyLabel(facilityTrend.range.to)}.`}
	                    actions={
		                      <button
		                        type="button"
		                        onClick={() =>
	                            void exportInspectionVinSheet({
	                              filenamePrefix: "daily-damage-submission-analytics",
	                              title: `Daily ${countNounTitle}`,
	                              cardFilters: [
	                                ["Card range from", facilityTrend.range.from],
	                                ["Card range to", facilityTrend.range.to],
	                                ["Card source", facilityTrend.source],
	                              ],
	                              cardRows: [
	                                ["Date", ...facilityTrend.facilities],
	                                ...facilityTrend.rows.map((row) => [
	                                  row.date,
	                                  ...facilityTrend.facilities.map((series) => String(row[series] ?? 0)),
	                                ]),
	                              ],
	                            })
	                          }
		                        disabled={vinSheetExporting}
		                        className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
		                      >
		                        <Download className="h-4 w-4" />
		                        {vinSheetExporting ? "Exporting" : "Export ZIP"}
		                      </button>
                    }
                  />
                  <CardContent className="h-96">
                    <div className="h-full overflow-x-auto">
                      <div className="h-full min-w-[760px]">
                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
	                          <BarChart data={facilityTrend.rows} margin={{ top: 8, right: 16, left: 0, bottom: 12 }} barCategoryGap="16%">
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
                              {facilityTrend.facilities.map((series) => (
                                <Bar
                                  key={series}
                                  dataKey={series}
                                  name={series}
                                  stackId="daily-analytics"
                                  fill={facilityTrend.colors[series] ?? chartTheme.colors.text}
                                  cursor="pointer"
                                  onClick={() => {
                                    if (series !== "Damage Submissions") {
                                      selectFacilityFromChart(series);
                                    }
                                  }}
                                />
                              ))}
	                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
	          </div>


          {!hideInspectorSections ? (
            <div className="grid gap-4">
              <Card className="overflow-hidden">
                <CardHeader
		                  title={inspectorTrend.hasDailyData ? `Daily Inspector ${countNounTitle}` : `Inspector ${countNounTitle}`}
		                  subtitle={inspectorTrend.hasDailyData ? `Per-day ${countNoun} by inspector for the selected range.` : `Analytics ${countNoun} totals by inspector.`}
                  actions={
	                    <button
	                      type="button"
	                      onClick={() =>
	                        void exportInspectionVinSheet({
	                          filenamePrefix: inspectorTrend.hasDailyData ? "daily-inspector-damage-submissions" : "inspector-damage-submissions",
	                          title: inspectorTrend.hasDailyData ? `Daily Inspector ${countNounTitle}` : `Inspector ${countNounTitle}`,
	                          cardFilters: [
	                            ["Card range from", inspectorTrend.range.from],
	                            ["Card range to", inspectorTrend.range.to],
	                            ["Inspector series", inspectorTrend.inspectors.join(" | ") || "Summary"],
	                          ],
	                          cardRows: inspectorTrend.hasDailyData
	                            ? [
	                                ["Date", ...inspectorTrend.inspectors],
	                                ...inspectorTrend.rows.map((row) => [
	                                  row.date,
	                                  ...inspectorTrend.inspectors.map((series) => String(row[series] ?? 0)),
	                                ]),
	                              ]
	                            : [
			                              ["Inspector", "Email", countNounTitle],
	                                ...inspectorChartRows.map((item) => [
	                                  item.label,
	                                  item.email,
			                              String(item.reportCount),
	                                ]),
	                              ],
	                        })
	                      }
	                      disabled={vinSheetExporting}
	                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
	                    >
	                      <Download className="h-4 w-4" />
	                      {vinSheetExporting ? "Exporting" : "Export ZIP"}
	                    </button>
                  }
                />
                <CardContent className="h-96">
                  {inspectorTrend.hasDailyData ? (
                    <div className="h-full overflow-x-auto">
                      <div className="h-full min-w-[760px]">
                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                          <BarChart data={inspectorTrend.rows} margin={{ top: 8, right: 16, left: 0, bottom: 12 }} barCategoryGap="16%">
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
                            {inspectorTrend.inspectors.map((series) => (
                              <Bar
                                key={series}
                                dataKey={series}
                                name={series}
                                stackId="daily-inspector-analytics"
                                fill={inspectorTrend.colors[series] ?? palette[0]}
                                cursor="pointer"
                                onClick={() => selectInspectorFromChart(series)}
                              />
                            ))}
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  ) : inspectorChartRows.length ? (
                    <div className="h-full overflow-x-auto">
                      <div className="h-full min-w-[760px]">
                        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
                          <BarChart data={inspectorChartRows} margin={{ top: 8, right: 16, left: 0, bottom: 12 }} barCategoryGap="16%">
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.colors.grid} />
                            <XAxis
                              dataKey="shortLabel"
                              type="category"
                              interval={0}
                              minTickGap={0}
                              tickMargin={8}
                              tick={{ fill: chartTheme.colors.text, fontSize: 11, fontWeight: 700 }}
                              stroke={chartTheme.colors.grid}
                            />
                            <YAxis tick={{ fill: chartTheme.colors.text, fontSize: 13, fontWeight: 700 }} stroke={chartTheme.colors.grid} allowDecimals={false} />
                            <Legend verticalAlign="top" align="left" iconType="square" wrapperStyle={{ paddingBottom: 12, fontSize: 13, fontWeight: 700 }} />
                            <Tooltip content={<NonZeroBarTooltip />} />
                            <Bar
                              dataKey="reportCount"
                              name={countNounTitle}
                              fill={palette[0]}
                              cursor="pointer"
                              onClick={(entry) => {
                                const label = (entry as { payload?: { label?: string } })?.payload?.label;
                                if (label) selectInspectorFromChart(label);
                              }}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
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
            <Card className="overflow-hidden">
              <CardHeader
                title="Severity Detail"
                subtitle={
                  selectedModelFilter === "all"
		                    ? `Six-level breakdown by ${isDamageCountMode ? "damage entry" : "damage report"}.`
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
	                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{formatNumber(primaryDamageTotal)} {countNoun}</p>
                    <button
                      type="button"
                      onClick={() =>
                        void exportInspectionVinSheet({
                          filenamePrefix: "severity-damage-submission-detail",
                          title: "Severity Detail",
                          cardFilters: [
                            ["Severity", selectedSeverityExportLabel],
                            ["Card inspection type selector", selectedCardInspectionTypeLabel],
                          ],
                          cardRows: [
                            ["Severity", "Damage Submissions", "Damaged Submissions", "Clear Submissions", "Entries Count", "VIN Samples"],
                            ...visibleSeverityPieData.map((slice) => [
                              slice.name,
                              slice.inspectionCount ?? slice.count,
                              slice.damageCount ?? slice.count,
                              slice.clearCount ?? 0,
                              slice.damageCount ?? slice.count,
                              (slice.vinSamples ?? []).join(" | "),
                            ]),
                          ],
                        })
                      }
                      disabled={vinSheetExporting}
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" />
                      {vinSheetExporting ? "Exporting" : "Export ZIP"}
                    </button>
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
                          data={visibleSeverityPieData}
                          dataKey="count"
                          nameKey="name"
                          outerRadius={100}
                          cx="50%"
                          cy="48%"
                          label={renderPieSliceLabel}
                          labelLine={false}
                          isAnimationActive={false}
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
                  title={`Section ${countNoun} rows`}
                  subtitle={selectedModelFilter === "all" ? `Total ${countNoun} per severity section.` : `Model ${countNoun} rows per severity section for the selected model.`}
                  items={severityFooterRows}
                  showSeverityPills
                />
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader
                title="Top Damage Areas"
                subtitle={`Pie chart for the current filtered ${countNoun}.`}
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
	                      {formatNumber(primaryDamageTotal)} {countNoun}
	                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        void exportInspectionVinSheet({
                          filenamePrefix: "damage-area-submission-detail",
                          title: "Top Damage Areas",
                          cardFilters: [
                            ["Damage Area", selectedDamageAreaFilter || "All damage areas"],
                            ["Card inspection type selector", selectedCardInspectionTypeLabel],
                          ],
                          cardRows: [
                            ["Damage Area", "Damage Submissions", "Damaged Submissions", "Clear Submissions", "Entries Count", "VIN Samples"],
                            ...visibleAreaPieData.map((slice) => [
                              slice.name,
                              slice.inspectionCount ?? slice.count,
                              slice.damageCount ?? slice.count,
                              slice.clearCount ?? 0,
                              slice.damageCount ?? slice.count,
                              (slice.vinSamples ?? []).join(" | "),
                            ]),
                          ],
                        })
                      }
                      disabled={vinSheetExporting}
                      className="inline-flex h-8 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-wait disabled:opacity-60"
                    >
                      <Download className="h-4 w-4" />
                      {vinSheetExporting ? "Exporting" : "Export ZIP"}
                    </button>
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
                          data={visibleAreaPieData}
                          dataKey="count"
                          nameKey="name"
                          outerRadius={100}
                          cx="50%"
                          cy="48%"
                          label={renderPieSliceLabel}
                          labelLine={false}
                          isAnimationActive={false}
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
                  title={`Section ${countNoun} rows`}
                  subtitle={selectedModelFilter === "all" ? `Total ${countNoun} per area section.` : `Model ${countNoun} rows per area section for the selected model.`}
                  items={areaFooterRows}
                  showRowCount={false}
                />
              </CardContent>
            </Card>
          </div>

    </div>
  );
}
