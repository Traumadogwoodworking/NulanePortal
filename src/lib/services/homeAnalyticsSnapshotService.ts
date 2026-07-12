import { apiFetch } from "@/lib/apiClient";
import type { DashboardAnalyticsParams, DashboardAnalyticsResponse } from "@/lib/services/reportService";

export type HomeAnalyticsSnapshotStatus = "queued" | "running" | "ready" | "failed" | "expired";

export type HomeAnalyticsFilterOption = {
  value: string;
  label: string;
  count?: number;
};

export type HomeAnalyticsSnapshotResult = {
  summary?: Record<string, number>;
  charts?: {
    byFacility?: Array<Record<string, unknown>>;
    byYard?: Array<Record<string, unknown>>;
    byInspector?: Array<Record<string, unknown>>;
    bySeverity?: Array<Record<string, unknown>>;
    byDamageArea?: Array<Record<string, unknown>>;
    byDamageType?: Array<Record<string, unknown>>;
    dailyTrend?: Array<Record<string, unknown>>;
    facilityTrend?: Array<Record<string, unknown>>;
    inspectorTrend?: Array<Record<string, unknown>>;
  };
  tables?: {
    facilityDamageStats?: Array<Record<string, unknown>>;
    topDamageAreas?: Array<Record<string, unknown>>;
    topInspectors?: Array<Record<string, unknown>>;
    recentReportsPreview?: Array<Record<string, unknown>>;
  };
  filter_options?: {
    facilities?: HomeAnalyticsFilterOption[];
    yards?: HomeAnalyticsFilterOption[];
    areas?: HomeAnalyticsFilterOption[];
    inspectionTypes?: HomeAnalyticsFilterOption[];
    inspectors?: HomeAnalyticsFilterOption[];
    severities?: HomeAnalyticsFilterOption[];
    damageAreas?: HomeAnalyticsFilterOption[];
    damageTypes?: HomeAnalyticsFilterOption[];
  };
  metadata?: {
    source?: string;
    generatedAt?: string;
    filterHash?: string;
    sourceReportCount?: number;
    warnings?: Array<Record<string, unknown>>;
  };
};

export type HomeAnalyticsSnapshotResponse = {
  ok: boolean;
  snapshot_id: string;
  status: HomeAnalyticsSnapshotStatus;
  cached?: boolean;
  poll_after_ms?: number;
  expires_at?: string | null;
  filters?: Record<string, unknown>;
  result?: HomeAnalyticsSnapshotResult | null;
  generated_at?: string | null;
  warnings?: Array<Record<string, unknown>>;
  error?: string;
};

function cleanSnapshotFilters(params: DashboardAnalyticsParams = {}): Record<string, string> {
  return Object.keys(params)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      const value = params[key as keyof DashboardAnalyticsParams];
      const text = value === undefined || value === null ? "" : String(value).trim();
      if (text) acc[key] = text;
      return acc;
    }, {});
}

export function getHomeAnalyticsSnapshotFilterKey(params: DashboardAnalyticsParams = {}) {
  return JSON.stringify(cleanSnapshotFilters(params));
}

export async function requestHomeAnalyticsSnapshot(params: DashboardAnalyticsParams = {}) {
  return apiFetch<HomeAnalyticsSnapshotResponse>("/dashboard/home-snapshot/request", {
    method: "POST",
    body: JSON.stringify({ filters: cleanSnapshotFilters(params) }),
    portal: {
      callerLabel: "homeAnalytics.requestSnapshot",
      timeoutMs: 15000,
    },
  });
}

export async function fetchHomeAnalyticsSnapshot(snapshotId: string, pollAttempt?: number) {
  return apiFetch<HomeAnalyticsSnapshotResponse>(`/dashboard/home-snapshot/${encodeURIComponent(snapshotId)}`, {
    portal: {
      callerLabel: "homeAnalytics.pollSnapshot",
      timeoutMs: 10000,
      pollAttempt,
    },
  });
}

export function adaptHomeSnapshotToDashboardAnalytics(
  snapshot: HomeAnalyticsSnapshotResponse | null | undefined
): DashboardAnalyticsResponse | undefined {
  const result = snapshot?.result;
  if (!result) return undefined;
  const summary = result.summary ?? {};
  const charts = result.charts ?? {};
  const tables = result.tables ?? {};
  const byFacility = (charts.byFacility ?? []).map((item) => ({
    ...item,
    id: String(item.value ?? item.id ?? item.key ?? ""),
    name: String(item.label ?? item.name ?? item.value ?? "Unassigned"),
    label: String(item.label ?? item.name ?? item.value ?? "Unassigned"),
    totalReports: Number(item.totalReports ?? item.count ?? 0),
    damageReports: Number(item.damageReports ?? item.count ?? 0),
    noDamageReports: Number(item.noDamageReports ?? 0),
    rsaReports: Number(item.rsaReports ?? 0),
  }));
  const byInspector = (charts.byInspector ?? []).map((item) => ({
    email: String(item.value ?? item.email ?? item.inspector_email ?? ""),
    label: String(item.label ?? item.value ?? item.email ?? "Unassigned"),
    reportCount: Number(item.reportCount ?? item.count ?? 0),
  }));
  const severity = (charts.bySeverity ?? []).map((item) => ({
    level: String(item.severity ?? item.value ?? item.level ?? ""),
    label: String(item.label ?? item.severity ?? item.value ?? ""),
    count: Number(item.count ?? 0),
  }));
  const dailyTrend = (charts.dailyTrend ?? []).map((item) => ({
    date: String(item.date ?? ""),
    damageReports: Number(item.damageReports ?? item.totalReports ?? item.count ?? 0),
    rsaReports: Number(item.rsaReports ?? 0),
  }));
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayTrend = dailyTrend.find((item) => item.date === todayKey);
  const damageReportsToday = Number(todayTrend?.damageReports ?? 0);
  const rsaReportsToday = Number(todayTrend?.rsaReports ?? 0);
  const reportsToday = Number(summary.reportsToday ?? 0);
  const clearReportsToday = Math.max(reportsToday - damageReportsToday - rsaReportsToday, 0);
  return {
    totals: {
      totalReports: Number(summary.totalReports ?? 0),
      damageReports: Number(summary.damageReports ?? 0),
      noDamageReports: Number(summary.noDamageReports ?? 0),
      rsaReports: Number(summary.rsaReports ?? 0),
      damageReportsToday,
      rsaReportsToday,
      reportsToday,
      noDamageReportsToday: clearReportsToday,
      reportsLast7Days: Number(summary.reportsLast7Days ?? 0),
      reportsThisMonth: Number(summary.reportsThisMonth ?? 0),
      reportsThisYear: Number(summary.reportsThisYear ?? 0),
      vins: Number(summary.uniqueVins ?? summary.vins ?? 0),
      facilities: Number(summary.facilities ?? 0),
      entries: Number(summary.damageReports ?? 0),
    },
    currentPeriod: {
      damageToday: damageReportsToday,
      damageLast7Days: Number(summary.reportsLast7Days ?? 0),
      damageMonthToDate: Number(summary.reportsThisMonth ?? 0),
      damageYearToDate: Number(summary.reportsThisYear ?? 0),
      rsaToday: rsaReportsToday,
      rsaLast7Days: 0,
    },
    severity,
    severityGroups: {
      low: severity.filter((item) => Number(item.level) <= 2).reduce((sum, item) => sum + item.count, 0),
      medium: severity.filter((item) => Number(item.level) >= 3 && Number(item.level) <= 4).reduce((sum, item) => sum + item.count, 0),
      high: severity.filter((item) => Number(item.level) >= 5).reduce((sum, item) => sum + item.count, 0),
    },
    dailyTrend,
    byFacility,
    facilities: byFacility,
    byInspector,
    byInspectorDaily: charts.inspectorTrend ?? [],
    byFacilityDaily: charts.facilityTrend ?? [],
    facilityDaily: charts.facilityTrend ?? [],
    topAreas: (charts.byDamageArea ?? tables.topDamageAreas ?? []).map((item) => ({
      name: String(item.label ?? item.value ?? item.name ?? ""),
      count: Number(item.count ?? 0),
    })),
    topTypes: (charts.byDamageType ?? []).map((item) => ({
      name: String(item.label ?? item.value ?? item.name ?? ""),
      count: Number(item.count ?? 0),
    })),
    byInspectionType: result.filter_options?.inspectionTypes?.map((item) => ({
      number: item.value,
      label: item.label,
      count: item.count ?? 0,
    })),
    recentActivity: tables.recentReportsPreview ?? [],
  };
}
