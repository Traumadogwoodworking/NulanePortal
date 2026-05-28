import { DAMAGE_SEVERITIES } from "@/lib/docudent/damageTaxonomy";
import { resolveDamageReportLocationName } from "@/lib/reportUtils";
import type { ReportDamageApiRow } from "@/lib/types";

export type FacilityDamageStats = {
  key: string;
  label: string;
  totalReports: number;
  reportsToday: number;
  reportsMonthToDate: number;
  reportsYearToDate: number;
  reportsLast7Days: number;
  uniqueVINs: number;
  totalDamageEntries: number;
  topSeverity: string | null;
  severityCounts: Record<string, number>;
  latestReportDate: string | null;
  mostCommonDamageArea: string | null;
  mostCommonDamageType: string | null;
  reportIds: string[];
};

export type FacilityTrendPoint = {
  date: string;
  [facilityLabel: string]: string | number;
};

type FacilityLike = {
  id?: string;
  name?: string;
  slug?: string;
  code?: string;
  location_id?: string;
  location_name?: string;
  location_label?: string;
};

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeFacilityLabel(value: string | null | undefined): string {
  const normalized = normalizeWhitespace((value ?? "").toString().replace(/[_-]+/g, " "));
  return normalized || "Unknown facility";
}

function canonicalValue(value: string | null | undefined): string {
  return normalizeFacilityLabel(value).toLowerCase();
}

function extractSuffixAfterDash(value: string | null | undefined): string {
  const normalized = normalizeWhitespace((value ?? "").toString());
  if (!normalized) return "";
  const dashMatch = normalized.split(/[–-]/);
  if (dashMatch.length > 1) {
    return normalizeWhitespace(dashMatch[dashMatch.length - 1]);
  }
  return normalized;
}

function facilityCandidates(facility: FacilityLike): string[] {
  const values = [
    facility.id,
    facility.location_id,
    facility.code,
    facility.slug,
    facility.name,
    facility.location_name,
    facility.location_label,
  ];
  return [
    ...values.map((value) => canonicalValue(value || "")).filter(Boolean),
    ...values.map((value) => canonicalValue(extractSuffixAfterDash(value || ""))).filter(Boolean),
  ];
}

function getNestedString(source: unknown, path: string[]): string {
  let current = source as unknown;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return "";
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" ? current.trim() : "";
}

function resolveReportFacilityCandidate(report: ReportDamageApiRow): string {
  const candidates = [
    report.location?.location_id,
    report.location?.location_name,
    report.location?.location_label,
    report.location?.facility,
    report.metadata?.location_id,
    report.metadata?.location_name,
    report.metadata?.location_label,
    report.metadata?.facility,
    report.metadata?.facility_name,
    report.metadata?.facilityName,
    report.metadata?.navigation,
    report.metadata?.navigation_row,
    report.metadata?.navFacility,
    report.payload?.location_id,
    report.payload?.location_name,
    report.payload?.location_label,
    report.payload?.facility,
    report.payload?.facility_name,
    report.payload?.facilityName,
    report.payload?.navigation,
    report.payload?.navigation_row,
    report.payload?.navFacility,
    report.report?.location_id,
    report.report?.location_name,
    report.report?.location_label,
    report.report?.facility,
    report.report?.facility_name,
    report.report?.facilityName,
    report.report?.navigation,
    report.report?.navigation_row,
    report.report?.navFacility,
    getNestedString(report, ["overview", "navigation"]),
    getNestedString(report, ["overview", "navigation_text"]),
    getNestedString(report, ["overview", "navigationText"]),
    getNestedString(report, ["overview", "navigationInstructions"]),
    extractSuffixAfterDash(resolveDamageReportLocationName(report)),
    resolveDamageReportLocationName(report),
  ];
  return candidates.map((value) => normalizeFacilityLabel(String(value || ""))).find((value) => value !== "Unknown facility") || "Unknown facility";
}

function resolveReportSeverityValue(report: ReportDamageApiRow): string | null {
  const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  let bestSeverity: string | null = null;
  let bestScore = -1;
  for (const entry of entries) {
    const entryRecord = entry as unknown as Record<string, unknown>;
    const rawSeverity = entryRecord.severity ?? entryRecord.severity_level ?? entryRecord.severityLevel ?? entryRecord.severity_level_code;
    const normalized = typeof rawSeverity === "string" ? rawSeverity.trim() : typeof rawSeverity === "number" && Number.isFinite(rawSeverity) ? String(rawSeverity) : "";
    if (!normalized) {
      continue;
    }
    const score = Number(normalized);
    if (Number.isFinite(score) && score > bestScore) {
      bestScore = score;
      bestSeverity = normalized;
    } else if (!Number.isFinite(score) && bestScore < 0) {
      bestSeverity = normalized;
      bestScore = 0;
    }
  }
  return bestSeverity;
}

function normalizeReportDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDamageEntryField(entry: Record<string, unknown>, key: string): string {
  const value = entry[key];
  return typeof value === "string" ? normalizeWhitespace(value) : "";
}

function severityRank(value: string | null): number {
  if (!value) return -1;
  const numeric = Number(value);
  if (Number.isFinite(numeric)) return numeric;
  const normalized = value.toLowerCase();
  if (normalized === "high") return 3;
  if (normalized === "medium") return 2;
  if (normalized === "low") return 1;
  return 0;
}

function severityLabel(value: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim();
  const option = DAMAGE_SEVERITIES.find((entry) => entry.value === normalized);
  return option?.label || normalized;
}

export function formatFacilitySeverityLabel(value: string | null | undefined): string {
  if (!value) {
    return "Unavailable";
  }
  return severityLabel(value) || "Unavailable";
}

export function getReportFacilityKey(report: ReportDamageApiRow): string {
  return canonicalValue(resolveReportFacilityCandidate(report));
}

export function getReportTopSeverity(report: ReportDamageApiRow): string | null {
  return resolveReportSeverityValue(report);
}

export function buildFacilityDamageStats(
  reports: ReportDamageApiRow[],
  facilities?: FacilityLike[]
): FacilityDamageStats[] {
  const facilityEntries = Array.isArray(facilities) ? facilities : [];
  const groupMap = new Map<string, FacilityDamageStats>();
  const vinSets = new Map<string, Set<string>>();
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const facilityIndex = facilityEntries.reduce<Record<string, { key: string; label: string }>>((acc, facility) => {
    const keys = facilityCandidates(facility);
    const key = keys[0] || canonicalValue(facility.name || facility.location_name || facility.location_label || facility.id || "Unknown facility");
    const label = normalizeFacilityLabel(facility.name || facility.location_name || facility.location_label || facility.code || facility.slug || facility.id || "Unknown facility");
    keys.forEach((candidate) => {
      acc[candidate] = { key, label };
    });
    return acc;
  }, {});

  const ensureGroup = (facilityKey: string, label: string) => {
    const existing = groupMap.get(facilityKey);
    if (existing) {
      return existing;
    }
    const created: FacilityDamageStats = {
      key: facilityKey,
      label,
      totalReports: 0,
      reportsToday: 0,
      reportsMonthToDate: 0,
      reportsYearToDate: 0,
      reportsLast7Days: 0,
      uniqueVINs: 0,
      totalDamageEntries: 0,
      topSeverity: null,
      severityCounts: {},
      latestReportDate: null,
      mostCommonDamageArea: null,
      mostCommonDamageType: null,
      reportIds: [],
    };
    groupMap.set(facilityKey, created);
    vinSets.set(facilityKey, new Set<string>());
    return created;
  };

  for (const report of reports || []) {
    const reportFacilityKey = getReportFacilityKey(report);
    const matchedFacility = facilityIndex[reportFacilityKey];
    const groupKey = matchedFacility?.key || reportFacilityKey || canonicalValue(resolveReportFacilityCandidate(report));
    const matchedFacilityLabel = matchedFacility?.label || normalizeFacilityLabel(resolveReportFacilityCandidate(report));
    const group = ensureGroup(groupKey, matchedFacilityLabel);
    group.totalReports += 1;
    group.reportIds.push(report.report_id);

    const reportDate = normalizeReportDate(report.created_at || report.updated_at || report.overview?.created_at || report.overview?.updated_at || undefined);
    if (reportDate) {
      if (reportDate >= weekAgo) {
        group.reportsLast7Days += 1;
      }
      if (reportDate >= monthStart) {
        group.reportsMonthToDate += 1;
      }
      if (reportDate >= yearStart) {
        group.reportsYearToDate += 1;
      }
      if (
        reportDate.getFullYear() === now.getFullYear() &&
        reportDate.getMonth() === now.getMonth() &&
        reportDate.getDate() === now.getDate()
      ) {
        group.reportsToday += 1;
      }
      if (!group.latestReportDate || reportDate > new Date(group.latestReportDate)) {
        group.latestReportDate = reportDate.toISOString();
      }
    }

    const vinKey = (report.vin || "").trim().toUpperCase();
    if (vinKey) {
      const vinSet = vinSets.get(group.key) || new Set<string>();
      vinSet.add(vinKey);
      vinSets.set(group.key, vinSet);
    }

    const damageEntries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
    group.totalDamageEntries += damageEntries.length;

    const severity = getReportTopSeverity(report);
    if (severity) {
      const label = severityLabel(severity) || severity;
      group.topSeverity = group.topSeverity
        ? severityRank(severity) > severityRank(group.topSeverity)
          ? label
          : group.topSeverity
        : label;
      group.severityCounts[severity] = (group.severityCounts[severity] || 0) + 1;
    }

    const areaCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    for (const entry of damageEntries) {
      const entryRecord = entry as unknown as Record<string, unknown>;
      const area = getDamageEntryField(entryRecord, "damage_area") || getDamageEntryField(entryRecord, "damage_area_code") || "Unknown area";
      const type = getDamageEntryField(entryRecord, "damage_type") || getDamageEntryField(entryRecord, "damage_type_code") || "Unknown type";
      areaCounts.set(area, (areaCounts.get(area) || 0) + 1);
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
    }
    if (areaCounts.size) {
      const topArea = [...areaCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      if (topArea) {
        group.mostCommonDamageArea = topArea;
      }
    }
    if (typeCounts.size) {
      const topType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      if (topType) {
        group.mostCommonDamageType = topType;
      }
    }
  }

  const facilityStats = [...groupMap.values()];
  for (const stat of facilityStats) {
    stat.uniqueVINs = vinSets.get(stat.key)?.size ?? 0;
  }

  return facilityStats.sort((a, b) => a.label.localeCompare(b.label));
}

export function buildFacilityDamageTrendData(
  reports: ReportDamageApiRow[],
  facilities?: FacilityLike[],
  days = 30
): { data: FacilityTrendPoint[]; keys: string[] } {
  const facilityEntries = Array.isArray(facilities) ? facilities : [];
  const facilityIndex = facilityEntries.reduce<Record<string, { key: string; label: string }>>((acc, facility) => {
    const keys = facilityCandidates(facility);
    const key = keys[0] || canonicalValue(facility.name || facility.location_name || facility.location_label || facility.id || "Unknown facility");
    const label = normalizeFacilityLabel(facility.name || facility.location_name || facility.location_label || facility.code || facility.slug || facility.id || "Unknown facility");
    keys.forEach((candidate) => {
      acc[candidate] = { key, label };
    });
    return acc;
  }, {});

  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - (days - 1));

  const facilityLabels = [
    ...new Set(
      facilityEntries
        .map((facility) => normalizeFacilityLabel(facility.name || facility.location_name || facility.location_label || facility.code || facility.slug || facility.id || "Unknown facility"))
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b));

  const rows = new Map<string, FacilityTrendPoint>();
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + offset);
    const key = date.toISOString().slice(0, 10);
    rows.set(key, { date: key, ...Object.fromEntries(facilityLabels.map((label) => [label, 0])) });
  }

  for (const report of reports || []) {
    const reportDate = normalizeReportDate(report.created_at || report.updated_at || report.overview?.created_at || report.overview?.updated_at || undefined);
    if (!reportDate) continue;
    const bucket = rows.get(reportDate.toISOString().slice(0, 10));
    if (!bucket) continue;

    const reportFacilityKey = getReportFacilityKey(report);
    const matchedFacility = facilityIndex[reportFacilityKey];
    if (!matchedFacility) continue;

    bucket[matchedFacility.label] = Number(bucket[matchedFacility.label] || 0) + 1;
  }

  return {
    data: [...rows.values()],
    keys: facilityLabels,
  };
}
