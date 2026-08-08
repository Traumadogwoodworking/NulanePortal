import type { DashboardAnalyticsResponse } from "@/lib/services/reportService";
import type { ChartWidgetData, DashboardSelectorContext, MetricWidgetData } from "./dashboardTypes";

function readTotal(snapshot: DashboardAnalyticsResponse | undefined, keys: string[]): number {
  const totals = snapshot?.totals as Record<string, unknown> | undefined;
  for (const key of keys) {
    const value = totals?.[key];
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

function readCurrent(snapshot: DashboardAnalyticsResponse | undefined, keys: string[]): number {
  const current = snapshot?.currentPeriod as Record<string, unknown> | undefined;
  for (const key of keys) {
    const value = current?.[key];
    const numeric = Number(value);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

function readNumber(record: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const numeric = Number(record[key]);
    if (Number.isFinite(numeric)) return numeric;
  }
  return 0;
}

function readString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" || typeof value === "number") {
      const normalized = String(value).trim();
      if (normalized) return normalized;
    }
  }
  return "";
}

function rowsFromSeries(
  rows: Array<Record<string, unknown>> = [],
  labelKeys: string[] = ["label", "name", "value"],
  valueKeys: string[] = ["count", "value", "reportCount", "totalReports"],
  filterKeys: string[] = ["filterValue", "value", "id", "label", "name"]
): ChartWidgetData {
  return {
    rows: rows
      .map((row) => ({
        label: readString(row, labelKeys) || "Unknown",
        value: readNumber(row, valueKeys),
        filterValue: readString(row, filterKeys),
      }))
      .filter((row) => row.filterValue || row.value > 0),
  };
}

export function selectTotalDamageSubmissions({ snapshot }: DashboardSelectorContext): MetricWidgetData {
  const damaged = readTotal(snapshot, ["damageReports", "damage_reports"]);
  const clear = readTotal(snapshot, ["noDamageReports", "noDamageCount", "noDamageScans"]);
  return {
    value: damaged + clear,
    detail: `Damaged ${damaged.toLocaleString()} · Clear ${clear.toLocaleString()}`,
  };
}

export function selectDamagedToday({ snapshot }: DashboardSelectorContext): MetricWidgetData {
  return {
    value:
      readCurrent(snapshot, ["damageToday", "damageEntriesToday"]) ||
      readTotal(snapshot, ["damageReportsToday", "damageToday"]),
    detail: "Filtered damaged submissions today",
  };
}

export function selectRsaReports({ snapshot }: DashboardSelectorContext): MetricWidgetData {
  const total = readTotal(snapshot, ["rsaReports", "rsa_reports"]);
  const today = readCurrent(snapshot, ["rsaToday"]) || readTotal(snapshot, ["rsaReportsToday"]);
  return {
    value: total,
    detail: `RSA today ${today.toLocaleString()}`,
  };
}

export function selectSeverityRows({ snapshot }: DashboardSelectorContext): ChartWidgetData {
  const seriesRows = snapshot?.series?.severityBreakdown ?? [];
  if (seriesRows.length > 0) {
    return rowsFromSeries(seriesRows, ["label", "severity", "value"], ["count", "damageReports", "reportCount"], ["value", "severity", "label"]);
  }
  return rowsFromSeries(snapshot?.severity ?? [], ["label", "level"], ["count"], ["level", "label"]);
}

export function selectDamageAreaRows({ snapshot }: DashboardSelectorContext): ChartWidgetData {
  const seriesRows = snapshot?.series?.topDamageAreas ?? [];
  if (seriesRows.length > 0) {
    return rowsFromSeries(seriesRows, ["label", "name", "damageArea"], ["count", "damageReports", "reportCount"], ["value", "damageArea", "label", "name"]);
  }
  return rowsFromSeries(snapshot?.topAreas ?? [], ["name"], ["count"], ["name"]);
}

export function selectTopModelRows({ snapshot }: DashboardSelectorContext): ChartWidgetData {
  return rowsFromSeries(snapshot?.series?.topModels ?? [], ["label", "model", "value"], ["count", "damageReports", "reportCount"], ["value", "model", "label"]);
}

export function selectDailyDamageTrendRows({ snapshot }: DashboardSelectorContext): ChartWidgetData {
  const seriesRows = snapshot?.series?.dailyDamageTrend ?? [];
  const rows = seriesRows.length > 0 ? seriesRows : snapshot?.dailyTrend ?? [];
  return {
    rows: rows.map((row) => {
      const record = row as Record<string, unknown>;
      return {
        label: readString(record, ["date", "day", "label"]),
        value: readNumber(record, ["damageReports", "damage_reports", "count", "value"]),
        secondaryValue: readNumber(record, ["rsaReports", "rsa_reports"]),
        secondaryLabel: "RSA Reports",
      };
    }).filter((row) => row.label),
  };
}

export function selectTopFacilityRows({ snapshot }: DashboardSelectorContext): ChartWidgetData {
  const seriesRows = snapshot?.series?.topFacilities ?? [];
  const rows = seriesRows.length > 0 ? seriesRows : snapshot?.byFacility ?? snapshot?.facilities ?? [];
  return rowsFromSeries(rows, ["label", "facility", "name", "location_label", "location_name"], ["count", "damageReports", "totalReports", "reportCount"], ["value", "facility_id", "location_id", "label", "name"]);
}

export function selectTopYardRows({ snapshot }: DashboardSelectorContext): ChartWidgetData {
  return rowsFromSeries(snapshot?.series?.topYards ?? [], ["label", "yard", "name"], ["count", "damageReports", "reportCount"], ["value", "yard", "label", "name"]);
}

export function selectInspectorVolumeRows({ snapshot }: DashboardSelectorContext): ChartWidgetData {
  const seriesRows = snapshot?.series?.inspectorVolume ?? [];
  const rows = seriesRows.length > 0 ? seriesRows : snapshot?.byInspector ?? [];
  return rowsFromSeries(rows, ["label", "email", "inspector"], ["count", "reportCount", "damageEntries", "totalDamages"], ["value", "email", "label"]);
}
