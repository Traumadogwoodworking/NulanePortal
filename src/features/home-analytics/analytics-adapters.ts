import {
  ANALYTICS_SPLIT_CLEAR_KEYS_ENTRIES,
  ANALYTICS_SPLIT_CLEAR_KEYS_REPORTS,
  ANALYTICS_SPLIT_DAMAGE_KEYS_ENTRIES,
  ANALYTICS_SPLIT_DAMAGE_KEYS_REPORTS,
  DASHBOARD_ANALYTICS_ENDPOINT,
} from "./constants";
import type {
  AnalyticsClearDamageCoverage,
  AnalyticsCoverageIssue,
  AnalyticsDailySplitCoverage,
  ClearDamageBreakdownItem,
  HomeCountMode,
  TrendSplitPair,
} from "./types";

export function readAnalyticsNumber(item: Record<string, unknown>, keys: string[]): number {
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

export function readAnalyticsString(item: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = item[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return fallback;
}

export function hasAnalyticsFieldValue(record: Record<string, unknown>, keys: string[]): boolean {
  return keys.some((key) => {
    const value = record[key];
    return (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.trim() !== "");
  });
}

export function readAnalyticsSplitPair(record: Record<string, unknown>, countMode: HomeCountMode): TrendSplitPair {
  const damageKeys = countMode === "damages" ? ANALYTICS_SPLIT_DAMAGE_KEYS_ENTRIES : ANALYTICS_SPLIT_DAMAGE_KEYS_REPORTS;
  const clearKeys = countMode === "damages" ? ANALYTICS_SPLIT_CLEAR_KEYS_ENTRIES : ANALYTICS_SPLIT_CLEAR_KEYS_REPORTS;
  const hasDamage = hasAnalyticsFieldValue(record, damageKeys);
  const hasClear = hasAnalyticsFieldValue(record, clearKeys);
  const explicitDamageCount = hasDamage ? readAnalyticsNumber(record, damageKeys) : 0;
  const explicitClearCount = hasClear ? readAnalyticsNumber(record, clearKeys) : 0;

  return {
    damageCount: hasDamage ? explicitDamageCount : 0,
    clearCount: hasClear ? explicitClearCount : 0,
    hasSplitData: hasDamage && hasClear,
  };
}

export function collectAnalyticsDailySplitCoverage(
  rows: Array<Record<string, unknown>> | undefined,
  countMode: HomeCountMode,
  scopeLabel: "facility" | "inspector"
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
    if (hasDamage && hasClear) splitRows += 1;
    if (!hasDamage) splitRowsMissingDamage += 1;
    if (!hasClear) splitRowsMissingClear += 1;
  }

  const hasRows = resolvedRows.length > 0;
  const missingDamage = countMode === "damages" ? "damageEntries (for damaged count)" : scopeLabel === "facility" ? "damageReports (or damage_count)" : "damageReports (for damaged count)";
  const missingClear = countMode === "damages" ? "clearEntries (for clear count)" : scopeLabel === "facility" ? "noDamageReports (or clearReports)" : "noDamageReports (for clear count)";

  return {
    hasRows,
    splitRows,
    splitRowsMissingDamage,
    splitRowsMissingClear,
    hasClearDamageSplit: splitRows > 0,
    missingSourceFields: [
      ...(!hasRows || splitRowsMissingDamage > 0 ? [missingDamage] : []),
      ...(!hasRows || splitRowsMissingClear > 0 ? [missingClear] : []),
    ],
  };
}

export function buildDashboardDailySplitCoverage(
  analytics: unknown,
  countMode: HomeCountMode
): AnalyticsDailySplitCoverage {
  const record = analytics && typeof analytics === "object" ? (analytics as Record<string, unknown>) : {};
  const facilityDailyRows = [
    ...(Array.isArray(record.byFacilityDaily) ? (record.byFacilityDaily as Array<Record<string, unknown>>) : []),
    ...(Array.isArray(record.facilityDaily) ? (record.facilityDaily as Array<Record<string, unknown>>) : []),
  ];
  const inspectorDailyRows = Array.isArray(record.byInspectorDaily)
    ? (record.byInspectorDaily as Array<Record<string, unknown>>)
    : [];

  return {
    facility: collectAnalyticsDailySplitCoverage(facilityDailyRows, countMode, "facility"),
    inspector: collectAnalyticsDailySplitCoverage(inspectorDailyRows, countMode, "inspector"),
    endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
    countMode,
  };
}

export function buildAnalyticsCoverageIssues(coverage: AnalyticsDailySplitCoverage): AnalyticsCoverageIssue[] {
  const issues: AnalyticsCoverageIssue[] = [];
  if (!coverage.facility.hasClearDamageSplit) {
    issues.push({
      visualId: "facility-daily-trend",
      label: "Facility daily clear/damaged trend",
      missingFields: coverage.facility.missingSourceFields,
      affectedRows: coverage.facility.hasRows ? coverage.facility.splitRowsMissingDamage + coverage.facility.splitRowsMissingClear : undefined,
      endpoint: coverage.endpoint,
    });
  }
  if (!coverage.inspector.hasClearDamageSplit) {
    issues.push({
      visualId: "inspector-daily-trend",
      label: "Inspector daily clear/damaged trend",
      missingFields: coverage.inspector.missingSourceFields,
      affectedRows: coverage.inspector.hasRows ? coverage.inspector.splitRowsMissingDamage + coverage.inspector.splitRowsMissingClear : undefined,
      endpoint: coverage.endpoint,
    });
  }
  return issues;
}

export function buildTrendBreakdownForPair(damageCount: number, clearCount: number): ClearDamageBreakdownItem[] {
  const entries: ClearDamageBreakdownItem[] = [];
  if (damageCount > 0 || (damageCount === 0 && clearCount === 0)) {
    entries.push({ label: "Damage", count: Number.isFinite(damageCount) ? Number(damageCount) : 0 });
  }
  if (clearCount > 0 || (damageCount === 0 && clearCount === 0)) {
    entries.push({ label: "Clear", count: Number.isFinite(clearCount) ? Number(clearCount) : 0 });
  }
  return entries;
}
