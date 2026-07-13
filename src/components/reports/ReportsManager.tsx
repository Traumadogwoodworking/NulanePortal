"use client";
/* eslint-disable @typescript-eslint/no-unused-vars, @next/next/no-img-element, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { PageTitle } from "@/components/ui/PageTitle";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptySelectionPanel } from "@/components/ui/EmptySelectionPanel";
import { FacilitySelector } from "@/components/ui/FacilitySelector";
import { ReportDateRangeFilter } from "@/components/reports/ReportDateRangeFilter";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ScrollArea } from "@/components/ui/ScrollArea";
import { Separator } from "@/components/ui/Separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DamageMapCard } from "@/components/reports/DamageMapCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { buildReportGallery } from "@/lib/reportGallery";
import { ReportsAdapter, fetchDamageReportDetail, fetchReportList } from "@/lib/services/reportService";
import {
  DAMAGE_FILTER_OPTIONS,
  DEFAULT_DAMAGE_REPORT_FILTERS,
  type DamageReportFilterKey,
} from "@/lib/reportFilters";
import { AuthRedirectError } from "@/lib/portalAuth";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { 
  Download, 
  FileEdit, 
  FileText, 
  Image as ImageIcon, 
  Maximize2,
  ListFilter,
  RefreshCw,
  Search,
  Filter,
  FilterX,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";
import { deriveReportSeverity, resolveDamageReportLocationName, slugForFacilityLabel } from "@/lib/reportUtils";
import { usePortalSession } from "@/lib/portalSession";
import {
  DAMAGE_AREAS,
  DAMAGE_SEVERITIES,
  getDamageTypeOptionsForArea,
  type DamageAreaOption,
  type DamageTypeOption,
} from "@/lib/docudent/damageTaxonomy";
import { toneForReportStatus } from "@/lib/status";
import { severityPillClass } from "@/lib/severityTheme";
import { normalizeReportListRow } from "@/lib/reportNormalizer";
import { usePortalFilterFacets } from "@/features/portal-filters/hooks/usePortalFilterFacets";
import { usePortalFilters } from "@/features/portal-filters/hooks/usePortalFilters";
import { PortalDataInspector } from "@/features/portal-diagnostics/PortalDataInspector";
import { getLatestPortalRequestDiagnostic } from "@/features/portal-diagnostics/portalRequestDiagnostics";
import {
  adaptPortalQueryForReportList,
  validatePortalQueryFacetValues,
  type PortalDataQuery,
  type PortalDataQueryField,
  type PortalDataSort,
} from "@/features/portal-filters/query";
import type { PortalFilterOption } from "@/features/portal-filters/model/facets";
import type {
  FacilitySummary,
  ReportDamageApiRow,
  ReportStatus,
  ReportSummary,
} from "@/lib/types";

interface ReportsManagerProps {
  mode: string;
}

const DAMAGE_REPORT_QUERY_FIELDS: readonly PortalDataQueryField[] = [
  "dateFrom",
  "dateTo",
  "facilityId",
  "yard",
  "inspectionTypeNumber",
  "inspector",
  "status",
  "make",
  "model",
  "severity",
  "damageArea",
  "damageType",
  "search",
  "sort",
  "reportId",
  "vin",
];

function includeSelectedFacetOption(options: PortalFilterOption[], selectedValue: string): PortalFilterOption[] {
  if (!selectedValue || options.some((option) => option.value === selectedValue)) return options;
  return [{ value: selectedValue, label: selectedValue }, ...options];
}

type ReportListRow = {
  report_id: string;
  organization_id?: string;
  vin?: string;
  make?: string;
  model?: string;
  year?: number | string | null;
  status?: string;
  inspector_email?: string;
  created_at?: string;
  updated_at?: string;
  inspection_type_number?: string | number | null;
  module_key?: string | null;
  location_id?: string | null;
  facility_id?: string | null;
  location_label?: string | null;
  location_name?: string | null;
  facility?: string | null;
  navigation?: string | null;
  location?: unknown;
  damage_summary?: unknown[];
  damage_entries?: ReportDamageApiRow["damage_entries"];
  damage_status?: string | null;
  damageStatus?: string | null;
  damage_found?: boolean | string | number | null;
  damageFound?: boolean | string | number | null;
  clean?: boolean | string | number | null;
  entry_kind?: string | null;
  source?: string | null;
  scan_status?: string | null;
  submitted_at?: string | null;
  submitted_by_email?: string | null;
  inventory_bay?: string | null;
  confirmed_bay?: string | null;
  sector?: string | null;
};

function getDamageReportGalleryUrls(report: ReportDamageApiRow | null): string[] {
  return report ? buildReportGallery(report).galleryUrls.filter(Boolean) : [];
}

function getDamageReportPhotoUrls(report: ReportDamageApiRow | null): string[] {
  return report ? buildReportGallery(report).photoUrls.filter(Boolean) : [];
}

function toDateInputValue(value: Date): string {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDamageReportTimestamp(value?: string | null): string {
  if (!value) {
    return "Unavailable";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unavailable";
  }
  const datePart = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
  const timePart = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

function normalizeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).replace(/\s+/g, " ").trim();
}

function formatDamageEntriesForCsv(entries: ReportDamageApiRow["damage_entries"]): string {
  if (!Array.isArray(entries) || entries.length === 0) {
    return "";
  }
  return entries
    .map((entry, index) => {
      const entryRecord = entry as unknown as Record<string, unknown>;
      const area = normalizeCsvValue(entryRecord.damage_area || entryRecord.damage_area_code || entryRecord.area_code || "");
      const type = normalizeCsvValue(entryRecord.damage_type || entryRecord.damage_type_code || entryRecord.type_code || "");
      const severity = normalizeCsvValue(entryRecord.severity ?? entryRecord.severity_level ?? entryRecord.severityLevel ?? "");
      const comments = normalizeCsvValue(entryRecord.comments || entryRecord.notes || "");
      return [`Damage ${index + 1}`, area, type, severity ? `Severity ${severity}` : "", comments].filter(Boolean).join(" | ");
    })
    .filter(Boolean)
    .join(" ; ");
}

function buildFilteredReportCsvRows(reports: ReportDamageApiRow[], primaryColumn: "facility" | "inspector"): unknown[][] {
  const primaryHeader = primaryColumn === "facility" ? "Facility" : "Inspector";
  const secondaryHeader = primaryColumn === "facility" ? "Inspector" : "Facility";
  return [
    [
      primaryHeader,
      secondaryHeader,
      "vin",
      "make",
      "model",
      "year",
      "status",
      "inspector_email",
      "comments",
      "created_at",
      "updated_at",
      "overview_comments",
      "bay_location",
      "navigation",
      "damage_entries",
    ],
    ...reports.map((report) => {
      const facility = resolveDamageReportLocationName(report);
      const inspector = report.inspector_email || "Unassigned";
      const overview = report.overview ?? {};
      return [
        primaryColumn === "facility" ? facility : inspector,
        primaryColumn === "facility" ? inspector : facility,
        report.vin || "",
        report.make || "",
        report.model || "",
        report.year ?? "",
        report.status || "",
        report.inspector_email || "",
        report.comments || "",
        report.created_at || "",
        report.updated_at || "",
        typeof overview.comments === "string" ? overview.comments : "",
        typeof overview.bay_location === "string" ? overview.bay_location : "",
        typeof overview.navigation === "string"
          ? overview.navigation
          : typeof overview.navigation_text === "string"
            ? overview.navigation_text
            : typeof overview.navigationText === "string"
              ? overview.navigationText
              : "",
        formatDamageEntriesForCsv(report.damage_entries),
      ];
    }),
  ];
}


type DamageReportEditEntryDraft = {
  entryId: string;
  damageSequence: number;
  damageAreaCode: string;
  damageTypeCode: string;
  severityLevel: string;
  comments: string;
};

type DamageReportEditDraft = {
  reportId: string;
  facilityLabel: string;
  vin: string;
  makeModelYear: string;
  comments: string;
  bayLocation: string;
  navigation: string;
  entries: DamageReportEditEntryDraft[];
};

function normalizeEntryText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function readRecordString(record: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function readClearBoolean(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "yes", "1"].includes(normalized)) return true;
    if (["false", "no", "0"].includes(normalized)) return false;
  }
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return null;
}

function isClearInspectionScanReport(report: ReportDamageApiRow | null): boolean {
  if (!report) return false;
  const record = report as unknown as Record<string, unknown>;
  const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  const summaryEntries = Array.isArray(report.damage_summary) ? report.damage_summary : [];
  const damageStatus = readRecordString(record, ["damage_status", "damageStatus", "damage_result", "damageResult"]).toLowerCase();
  const inspectionType = readRecordString(record, ["inspection_type_number", "inspectionTypeNumber", "inspection_type", "inspectionType"]);
  const source = readRecordString(record, ["entry_kind", "source_type", "sourceType", "source", "type"]).toLowerCase();
  const clean = readClearBoolean(record.clean);
  const damageFound = readClearBoolean(record.damage_found ?? record.damageFound);
  const isInspectionScan =
    inspectionType.replace(/\D+/g, "").replace(/^0+/, "") === "2" ||
    source === "inspection_scan" ||
    source === "inspection_scan_submission" ||
    source === "mobile_app";
  const hasClearSignal = damageStatus === "no_damage" || clean === true || damageFound === false;
  return isInspectionScan && hasClearSignal && entries.length === 0 && summaryEntries.length === 0;
}

function getClearInspectionScanMeta(report: ReportDamageApiRow | null) {
  const record = (report ?? {}) as unknown as Record<string, unknown>;
  return {
    timestamp: readRecordString(record, ["submitted_at", "submittedAt", "created_at", "createdAt", "updated_at", "updatedAt"]),
    inspectorEmail: readRecordString(record, ["submitted_by_email", "submittedByEmail", "inspector_email", "inspectorEmail"]),
    inventoryBay: readRecordString(record, ["inventory_bay", "inventoryBay"]),
    confirmedBay: readRecordString(record, ["confirmed_bay", "confirmedBay"]),
    sector: readRecordString(record, ["sector"]),
  };
}

function toEditSeverityValue(value: unknown): string {
  const normalized = normalizeEntryText(value);
  return normalized || "1";
}

function buildDamageReportEditDraft(report: ReportDamageApiRow | null): DamageReportEditDraft | null {
  if (!report) {
    return null;
  }
  const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  const overview = report.overview || {};
  const overviewRecord = overview as unknown as Record<string, unknown>;
  return {
    reportId: report.report_id || report.report_id?.trim() || "",
    facilityLabel: resolveDamageReportLocationName(report) || "Unknown Facility",
    vin: report.vin || "",
    makeModelYear: `${report.make || ""} ${report.model || ""} ${report.year ? `(${report.year})` : ""}`.trim(),
    comments: normalizeEntryText(overview.comments || report.comments || report.overview?.comments || ""),
    bayLocation: normalizeEntryText(overviewRecord.bay_location || overviewRecord.bayLocation || ""),
    navigation: normalizeEntryText(
      overview.navigation ||
        overview.navigation_text ||
        overview.navigationText ||
        overview.navigationInstructions ||
        ""
    ),
    entries: entries.map((entry, index) => {
      const entryRecord = entry as unknown as Record<string, unknown>;
      return {
        entryId: normalizeEntryText(
          entryRecord.damage_entry_id || entryRecord.entry_id || entryRecord.id || `entry-${index + 1}`
        ),
        damageSequence: Number.isFinite(Number(entryRecord.damage_sequence)) ? Number(entryRecord.damage_sequence) : index + 1,
        damageAreaCode: normalizeEntryText(entryRecord.damage_area_code || entryRecord.area_code || entryRecord.damage_area || ""),
        damageTypeCode: normalizeEntryText(entryRecord.damage_type_code || entryRecord.type_code || entryRecord.damage_type || ""),
        severityLevel: toEditSeverityValue(entryRecord.severity ?? entryRecord.severity_level ?? entryRecord.severityLevel),
        comments: normalizeEntryText(entryRecord.comments || entryRecord.notes || ""),
      };
    }),
  };
}

function getDamageTypesForArea(areaCode: string): DamageTypeOption[] {
  return areaCode ? getDamageTypeOptionsForArea(areaCode) : [];
}

function resolveListLocationLabel(location: unknown): string {
  if (typeof location === "string") {
    const normalized = location.trim();
    return normalized ? normalized : "Unavailable";
  }
  if (location && typeof location === "object") {
    const record = location as Record<string, unknown>;
    const candidates = [
      record.location_label,
      record.location_name,
      record.display_name,
      record.name,
      record.label,
      record.facility,
    ];
    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  return "Unavailable";
}

function normalizeFacilityChoiceLabel(value: string | null | undefined): string {
  const normalized = (value ?? "").toString().trim().replace(/\s+/g, " ");
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

function listRowToSummary(report: ReportListRow): ReportSummary {
  const normalized = normalizeReportListRow(report);
  const pseudoReport = {
    ...(report as unknown as ReportDamageApiRow),
    report_id: normalized.reportId || normalized.id || report.report_id,
    vin: normalized.vin || report.vin,
    make: report.make,
    model: report.model,
    year: typeof report.year === "number" ? report.year : undefined,
    status: normalized.status as ReportStatus | undefined,
    inspector_email: normalized.inspectorEmail || report.inspector_email,
    created_at: normalized.createdAt || normalized.submittedAt || report.created_at,
    updated_at: normalized.updatedAt || report.updated_at,
    location_id: normalized.facilityId || report.location_id || undefined,
    facility_id: normalized.facilityId || report.facility_id || undefined,
    location_label: normalized.locationLabel || normalized.facilityName || report.location_label || undefined,
    location_name: normalized.locationLabel || normalized.facilityName || report.location_name || undefined,
    facility: normalized.facilityName || report.facility || undefined,
    navigation: normalized.locationLabel || normalized.facilityName || report.navigation || undefined,
    location: report.location && typeof report.location === "object" ? (report.location as Record<string, unknown>) : null,
    damage_summary: Array.isArray(report.damage_summary) ? (report.damage_summary as Array<Record<string, unknown>>) : [],
    damage_entries: Array.isArray((report as unknown as ReportDamageApiRow).damage_entries)
      ? (report as unknown as ReportDamageApiRow).damage_entries
      : normalized.damageStatus === "no_damage"
        ? []
        : undefined,
    photo_urls: normalized.photoUrls,
    splat_urls: normalized.splatUrls,
    pdf_url: normalized.pdfUrl,
  } as ReportDamageApiRow;
  const locationName = resolveDamageReportLocationName(pseudoReport);
  const severity = deriveReportSeverity(pseudoReport);
  return {
    id: normalized.reportId || normalized.id || report.report_id,
    type: "damage",
    status: (normalized.status as ReportStatus) || "open",
    title: `${report.make || ""} ${report.model || ""}`.trim() || normalized.reportId || report.report_id,
    vin: normalized.vin || "",
    make: report.make,
    model: report.model,
    year:
      typeof report.year === "number"
        ? report.year
        : typeof report.year === "string" && report.year.trim()
          ? Number(report.year)
          : undefined,
    inspectorEmail: normalized.inspectorEmail || report.inspector_email,
    locationName,
    facilityName: locationName,
    createdAt: normalized.createdAt || normalized.submittedAt || report.created_at,
    updatedAt: normalized.updatedAt || report.updated_at,
    severity,
  };
}

function findDamageAreaByCode(code: string): DamageAreaOption | null {
  return DAMAGE_AREAS.find((area) => area.code === code) ?? null;
}

function resolveBackendDamageSeverity(report: ReportDamageApiRow): string | null {
  const reportRecord = report as unknown as Record<string, unknown>;
  const candidates = [
    reportRecord.severity,
    report.overview && typeof report.overview === "object"
      ? (report.overview as Record<string, unknown>).severity
      : null,
    report.metadata && typeof report.metadata === "object"
      ? (report.metadata as Record<string, unknown>).severity
      : null,
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return String(candidate);
    }
  }
  return null;
}

function resolveTopDamageSeverity(
  report: ReportDamageApiRow,
  entries: ReportDamageApiRow["damage_entries"]
): string | null {
  const backendSeverity = resolveBackendDamageSeverity(report);
  if (backendSeverity) {
    return backendSeverity;
  }
  if (!Array.isArray(entries)) {
    return null;
  }
  for (const entry of entries) {
    const entryRecord = entry as unknown as Record<string, unknown>;
    const rawSeverity =
      entryRecord.severity ??
      entryRecord.severity_level ??
      entryRecord.severityLevel ??
      entryRecord.severity_level_code ??
      null;
    const severity = toEditSeverityValue(rawSeverity);
    if (severity) {
      return severity;
    }
  }
  return null;
}

function resolveSeverityLabel(value?: string | number | null): string {
  if (value === undefined || value === null || value === "") {
    return "Severity unavailable";
  }
  const normalized = `${value}`.trim();
  const option = DAMAGE_SEVERITIES.find((entry) => entry.value === normalized);
  return option?.label || normalized;
}

function severitySortValue(value?: string | number | null): number {
  if (value === undefined || value === null) return -1;
  const normalized = `${value}`.trim().toLowerCase();
  if (!normalized || normalized === "n/a") return -1;
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? numeric : DAMAGE_SEVERITIES.findIndex((entry) => entry.value === normalized);
}

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);
  return debouncedValue;
}

function normalizeReportListResponseRows(rows: unknown[] | undefined): ReportListRow[] {
  return (rows ?? []).map((row) => {
    const normalized = normalizeReportListRow(row);
    const record = row && typeof row === "object" ? row : {};
    return { ...record, report_id: normalized.reportId || normalized.id || (record as ReportListRow).report_id } as ReportListRow;
  });
}

export function ReportsManager({ mode }: ReportsManagerProps) {
  const { organizationId, status: sessionStatus, isPortalAccessAllowed, session } = usePortalSession();
  const portalFilters = usePortalFilters({ allowedFields: DAMAGE_REPORT_QUERY_FIELDS });
  const { data: filterFacetResponse, error: filterFacetError, isLoading: filterFacetsLoading, mutate: refreshFilterFacets } = usePortalFilterFacets();
  const [rejectedFacetFilterNotice, setRejectedFacetFilterNotice] = useState<string | null>(null);
  const facetValueValidation = useMemo(
    () => filterFacetResponse
      ? validatePortalQueryFacetValues(portalFilters.query, filterFacetResponse.facets)
      : { ok: true as const, issues: [] },
    [filterFacetResponse, portalFilters.query]
  );
  useEffect(() => {
    if (facetValueValidation.ok) return;
    setRejectedFacetFilterNotice(
      `Unsupported authorized filter values were removed: ${facetValueValidation.issues.map((issue) => issue.field).join(", ")}.`
    );
    const rejected = Object.fromEntries(
      facetValueValidation.issues.map((issue) => [issue.field, undefined])
    ) as Partial<PortalDataQuery>;
    portalFilters.updateFilters(rejected, { history: "replace" });
  }, [facetValueValidation]);
  const statusFilter = portalFilters.query.status ?? "";
  const facilityFilter = portalFilters.query.facilityId ?? DEFAULT_DAMAGE_REPORT_FILTERS.facilityFilter;
  const searchTerm = portalFilters.query.search ?? "";
  const reportIdFilter = portalFilters.query.reportId ?? "";
  const vinFilter = portalFilters.query.vin ?? "";
  const inspectionTypeFilter = portalFilters.query.inspectionTypeNumber ?? "";
  const [inspectionTypeSearch, setInspectionTypeSearch] = useState(inspectionTypeFilter);
  const [inspectionTypeSuggestionsOpen, setInspectionTypeSuggestionsOpen] = useState(false);
  const makeFilter = portalFilters.query.make ?? "";
  const modelFilter = portalFilters.query.model ?? "";
  const yardFilter = portalFilters.query.yard ?? "";
  const inspectorEmailFilter = portalFilters.query.inspector ?? "";
  const severityFilter = portalFilters.query.severity ?? "";
  const damageAreaFilter = portalFilters.query.damageArea ?? "";
  const damageTypeFilter = portalFilters.query.damageType ?? "";
  const createdFrom = portalFilters.query.dateFrom ?? "";
  const createdTo = portalFilters.query.dateTo ?? "";
  const setFacilityFilter = useCallback((value: string) => portalFilters.setFilter("facilityId", value === "all" ? undefined : value), [portalFilters]);
  const setSearchTerm = useCallback((value: string) => portalFilters.setFilter("search", value || undefined), [portalFilters]);
  const setReportIdFilter = useCallback((value: string) => portalFilters.setFilter("reportId", value || undefined), [portalFilters]);
  const setVinFilter = useCallback((value: string) => portalFilters.setFilter("vin", value || undefined), [portalFilters]);
  const setInspectionTypeFilter = useCallback((value: string) => portalFilters.setFilter("inspectionTypeNumber", value || undefined), [portalFilters]);
  const setMakeFilter = useCallback((value: string) => portalFilters.setFilter("make", value || undefined), [portalFilters]);
  const setModelFilter = useCallback((value: string) => portalFilters.setFilter("model", value || undefined), [portalFilters]);
  const setYardFilter = useCallback((value: string) => portalFilters.setFilter("yard", value || undefined), [portalFilters]);
  const setInspectorEmailFilter = useCallback((value: string) => portalFilters.setFilter("inspector", value || undefined), [portalFilters]);
  const setStatusFilter = useCallback((value: string) => portalFilters.setFilter("status", value || undefined), [portalFilters]);
  const setSeverityFilter = useCallback((value: string) => portalFilters.setFilter("severity", value || undefined), [portalFilters]);
  const setDamageAreaFilter = useCallback((value: string) => portalFilters.setFilter("damageArea", value || undefined), [portalFilters]);
  const setDamageTypeFilter = useCallback((value: string) => portalFilters.setFilter("damageType", value || undefined), [portalFilters]);
  const queryDamageFilterKeys = useMemo<DamageReportFilterKey[]>(() => {
    const keys: DamageReportFilterKey[] = [];
    if (portalFilters.query.facilityId) keys.push("facility");
    if (portalFilters.query.reportId) keys.push("report_id");
    if (portalFilters.query.vin) keys.push("vin");
    if (portalFilters.query.inspectionTypeNumber) keys.push("inspection_type");
    if (portalFilters.query.make) keys.push("make");
    if (portalFilters.query.model) keys.push("model");
    if (portalFilters.query.yard) keys.push("yard");
    if (portalFilters.query.inspector) keys.push("inspector_email");
    if (portalFilters.query.status) keys.push("status");
    if (portalFilters.query.severity) keys.push("severity");
    if (portalFilters.query.damageArea) keys.push("damage_area");
    if (portalFilters.query.damageType) keys.push("damage_type");
    if (portalFilters.query.dateFrom || portalFilters.query.dateTo) keys.push("date_range");
    return keys;
  }, [portalFilters.query]);
  const [activeDamageFilterKeys, setActiveDamageFilterKeys] = useState<DamageReportFilterKey[]>(queryDamageFilterKeys);
  useEffect(() => {
    if (portalFilters.changeSource === "navigation") {
      setActiveDamageFilterKeys(queryDamageFilterKeys);
      return;
    }
    if (!queryDamageFilterKeys.length) return;
    setActiveDamageFilterKeys((current) => Array.from(new Set([...current, ...queryDamageFilterKeys])));
  }, [portalFilters.changeSource, queryDamageFilterKeys]);
  const [damageFilterMenuOpen, setDamageFilterMenuOpen] = useState(false);
  const [damageSortField, setDamageSortField] = useState<"severity" | "created">("created");
  const [damageSortDirections, setDamageSortDirections] = useState<Record<"severity" | "created", "asc" | "desc">>({
    severity: "desc",
    created: "desc",
  });
  const [selectedDamageReportId, setSelectedDamageReportId] = useState<string | null>(null);
  const [selectedDamageReportIds, setSelectedDamageReportIds] = useState<string[]>([]);
  const [damageMultiSelectEnabled, setDamageMultiSelectEnabled] = useState(false);
  const [isDamageEditOpen, setIsDamageEditOpen] = useState(false);
  const [damageEditDraft, setDamageEditDraft] = useState<DamageReportEditDraft | null>(null);
  const [damageEditStatus, setDamageEditStatus] = useState<string | null>(null);
  const [isDownloadingPhotos, setIsDownloadingPhotos] = useState(false);
  const [isDownloadingSelectedPdf, setIsDownloadingSelectedPdf] = useState(false);
  const [isDownloadingSelectedCsv, setIsDownloadingSelectedCsv] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [listRows, setListRows] = useState<ReportListRow[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const listSort: PortalDataSort = portalFilters.query.sort ?? "created_at_desc";
  const [reloadToken, setReloadToken] = useState(0);
  const hideFacilitySelector = (session?.organization?.name ?? "").trim().toLowerCase() === "free tier organization";
  const hideFacilityColumn = hideFacilitySelector;
  const debouncedBackendSearch = useDebouncedValue(searchTerm, 300);
  const debouncedInspectorEmailFilter = useDebouncedValue(inspectorEmailFilter, 300);
  const listUserScopeId = session?.user?.user_id?.trim() ?? "";

  const isMounted = useRef(true);
  const damageSortFieldRef = useRef(damageSortField);
  const hydratedDamageReportIdsRef = useRef(new Set<string>());
  const listPageRequestInFlightRef = useRef(false);
  const listLoadSequenceRef = useRef(0);
  const listRowIdsRef = useRef(new Set<string>());
  useEffect(() => {
    damageSortFieldRef.current = damageSortField;
  }, [damageSortField]);
  const listFilters = useMemo(
    () =>
      adaptPortalQueryForReportList({
        dateFrom: portalFilters.query.dateFrom,
        dateTo: portalFilters.query.dateTo,
        yard: portalFilters.query.yard,
        inspectionTypeNumber: portalFilters.query.inspectionTypeNumber,
        status: portalFilters.query.status,
        make: portalFilters.query.make,
        model: portalFilters.query.model,
        severity: portalFilters.query.severity,
        damageArea: portalFilters.query.damageArea,
        damageType: portalFilters.query.damageType,
        reportId: portalFilters.query.reportId,
        vin: portalFilters.query.vin,
        search: debouncedBackendSearch || undefined,
        inspector: debouncedInspectorEmailFilter || undefined,
        facilityId: facilityFilter !== "all" && facilityFilter !== "other" ? facilityFilter : undefined,
        sort: listSort,
        pageSize,
      }),
    [
      debouncedBackendSearch,
      debouncedInspectorEmailFilter,
      facilityFilter,
      listSort,
      pageSize,
      portalFilters.query.damageArea,
      portalFilters.query.damageType,
      portalFilters.query.dateFrom,
      portalFilters.query.dateTo,
      portalFilters.query.inspectionTypeNumber,
      portalFilters.query.make,
      portalFilters.query.model,
      portalFilters.query.reportId,
      portalFilters.query.severity,
      portalFilters.query.status,
      portalFilters.query.vin,
      portalFilters.query.yard,
    ]
  );
  const activeInspectionTypeOptions = useMemo(
    () => includeSelectedFacetOption(filterFacetResponse?.facets.inspectionTypes ?? [], inspectionTypeFilter)
      .map((option) => ({ number: option.value, label: option.label, displayLabel: `${option.value} - ${option.label}` })),
    [filterFacetResponse?.facets.inspectionTypes, inspectionTypeFilter]
  );
  const filteredInspectionTypeOptions = useMemo(() => {
    const query = inspectionTypeSearch.trim().toLowerCase();
    if (!query) return activeInspectionTypeOptions;
    return activeInspectionTypeOptions.filter((option) =>
      `${option.number} ${option.label} ${option.displayLabel}`.toLowerCase().includes(query)
    );
  }, [activeInspectionTypeOptions, inspectionTypeSearch]);
  useEffect(() => {
    if (!inspectionTypeFilter) {
      setInspectionTypeSearch("");
      return;
    }
    const option = activeInspectionTypeOptions.find((entry) => entry.number === inspectionTypeFilter);
    setInspectionTypeSearch(option ? `${option.number} - ${option.label}` : inspectionTypeFilter);
  }, [activeInspectionTypeOptions, inspectionTypeFilter]);
  const selectedDamageReports = useMemo(
    () =>
      selectedDamageReportIds
        .map((reportId) => listRows.find((report) => report.report_id === reportId))
        .filter((report): report is ReportListRow => Boolean(report)),
    [listRows, selectedDamageReportIds]
  );
  const selectedDamageReportsCount = selectedDamageReports.length;
  const selectedDamageReportVins = useMemo(
    () =>
      selectedDamageReports.map((report) => report.vin || "VIN unavailable")
        .filter((vin, index, values) => values.indexOf(vin) === index),
    [selectedDamageReports]
  );

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!organizationId) {
      setError("No organization selected. Please select an organization to view reports.");
      return;
    }
    if (sessionStatus !== "success") {
      setError("Authentication required to fetch reports.");
      return;
    }
    setError(listError);
  }, [listError, organizationId, sessionStatus]);

  const damageSummaries = useMemo<ReportSummary[]>(() => listRows.map(listRowToSummary), [listRows]);

  // `/reports/list` is the authoritative filtered result. Re-filtering the
  // projected summaries here previously discarded yard/inspection/facility IDs
  // and rejected valid backend rows.
  const filteredDamageReports = damageSummaries;

  const filteredDamageSummaries = useMemo(() => {
    return filteredDamageReports;
  }, [filteredDamageReports]);

  const sortedDamageSummaries = useMemo(() => {
    const withIndex = filteredDamageSummaries.map((summary, index) => ({ summary, index }));
    const directionFactor = damageSortDirections[damageSortField] === "asc" ? 1 : -1;
    withIndex.sort((left, right) => {
      let comparison = 0;
      if (damageSortField === "severity") {
        comparison = severitySortValue(left.summary.severity) - severitySortValue(right.summary.severity);
      } else {
        const leftTime = left.summary.createdAt ? new Date(left.summary.createdAt).getTime() : -Infinity;
        const rightTime = right.summary.createdAt ? new Date(right.summary.createdAt).getTime() : -Infinity;
        comparison = leftTime - rightTime;
      }
      if (comparison === 0) {
        comparison = left.index - right.index;
      }
      return comparison * directionFactor;
    });
    return withIndex.map(({ summary }) => summary);
  }, [damageSortDirections, damageSortField, filteredDamageSummaries]);

  const selectedDamageFullRow = useMemo(
    () => (listRows.find((r) => r.report_id === selectedDamageReportId) as unknown as ReportDamageApiRow | null) ?? null,
    [listRows, selectedDamageReportId]
  );
  const selectedDamagePhotos = useMemo(
    () => getDamageReportPhotoUrls(selectedDamageFullRow),
    [selectedDamageFullRow]
  );
  const [brokenDamagePhotoUrls, setBrokenDamagePhotoUrls] = useState<Record<string, boolean>>({});
  const [activeDamagePhotoUrl, setActiveDamagePhotoUrl] = useState<string | null>(null);
  const selectedDamagePdfUrl = useMemo(
    () => (selectedDamageFullRow ? ReportsAdapter.resolveDamageReportPdfUrl(selectedDamageFullRow) : null),
    [selectedDamageFullRow]
  );
  const selectedDamageEntries = useMemo(
    () => (selectedDamageFullRow && Array.isArray(selectedDamageFullRow.damage_entries) ? selectedDamageFullRow.damage_entries : []),
    [selectedDamageFullRow]
  );
  const selectedDamageIsClearScan = useMemo(
    () => isClearInspectionScanReport(selectedDamageFullRow),
    [selectedDamageFullRow]
  );
  const selectedDamageClearMeta = useMemo(
    () => getClearInspectionScanMeta(selectedDamageFullRow),
    [selectedDamageFullRow]
  );

  useEffect(() => {
    if (
      !selectedDamageReportId ||
      selectedDamageIsClearScan ||
      hydratedDamageReportIdsRef.current.has(selectedDamageReportId)
    ) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const match = await fetchDamageReportDetail(selectedDamageReportId);
        if (cancelled) return;
        hydratedDamageReportIdsRef.current.add(selectedDamageReportId);
        if (match) {
          setSelectedDamageReportId(match.report_id);
          hydratedDamageReportIdsRef.current.add(match.report_id);
          setListRows((current) =>
            current.map((row) =>
              row.report_id === selectedDamageReportId || row.report_id === match.report_id
                ? ({ ...row, ...match, report_id: match.report_id || row.report_id } as ReportListRow)
                : row
            )
          );
        }
      } catch {
        hydratedDamageReportIdsRef.current.add(selectedDamageReportId);
        // keep the list-row fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDamageFullRow, selectedDamageIsClearScan, selectedDamageReportId]);
  const facilityChoices = useMemo<FacilitySummary[]>(() => {
    return includeSelectedFacetOption(filterFacetResponse?.facets.facilities ?? [], facilityFilter === "all" ? "" : facilityFilter).map((option) => ({
      id: option.value,
      name: option.label,
      slug: slugForFacilityLabel(option.label),
      active: true,
      locationCount: 1,
    }));
  }, [facilityFilter, filterFacetResponse?.facets.facilities]);
  const yardChoices = includeSelectedFacetOption(filterFacetResponse?.facets.yards ?? [], yardFilter);
  const inspectorChoices = useMemo(
    () => includeSelectedFacetOption(filterFacetResponse?.facets.inspectors ?? [], inspectorEmailFilter).map((option) => ({ email: option.value, label: option.label })),
    [filterFacetResponse?.facets.inspectors, inspectorEmailFilter]
  );
  const reportDateBounds = useMemo(() => {
    const dates = damageSummaries
      .map((summary) => (summary.createdAt ? new Date(summary.createdAt) : null))
      .filter((date): date is Date => date instanceof Date && !Number.isNaN(date.getTime()))
      .sort((left, right) => left.getTime() - right.getTime());
    return {
      minDate: dates[0] ? toDateInputValue(dates[0]) : null,
      maxDate: dates[dates.length - 1] ? toDateInputValue(dates[dates.length - 1]) : null,
    };
  }, [damageSummaries]);
  const reportRequestDiagnostic = getLatestPortalRequestDiagnostic("/reports/list");
  const reportFacetCounts = useMemo(() => {
    const facets = filterFacetResponse?.facets;
    if (!facets) return {};
    return {
      facilities: facets.facilities.length,
      yards: facets.yards.length,
      inspectionTypes: facets.inspectionTypes.length,
      inspectors: facets.inspectors.length,
      statuses: facets.statuses.length,
      makes: facets.makes.length,
      models: facets.models.length,
      severities: facets.severities.length,
      damageAreas: facets.damageAreas.length,
      damageTypes: facets.damageTypes.length,
    };
  }, [filterFacetResponse?.facets]);

  useEffect(() => {
    const loadSequence = listLoadSequenceRef.current + 1;
    listLoadSequenceRef.current = loadSequence;
    const logStaleResponse = (pageNumber: number) => {
      if (process.env.NODE_ENV !== "production") {
        console.info("[portal-data] stale response ignored", {
          endpoint: "/api/reports/list",
          page: pageNumber,
          requestSequence: loadSequence,
        });
      }
    };
    const clearVisibleRows = () => {
      listRowIdsRef.current = new Set();
      setListRows([]);
      setListError(null);
      setSelectedDamageReportId(null);
      setSelectedDamageReportIds([]);
      setPage(1);
      setTotalCount(0);
      setHasNextPage(true);
    };

    clearVisibleRows();
    if (!organizationId || sessionStatus !== "success" || !listUserScopeId || !isPortalAccessAllowed) {
      listPageRequestInFlightRef.current = false;
      setListLoading(false);
      return () => {
        if (listLoadSequenceRef.current === loadSequence) listLoadSequenceRef.current += 1;
      };
    }

    async function loadPage(nextPage: number, reset = false) {
      listPageRequestInFlightRef.current = true;
      setListLoading(true);
      setListError(null);
      try {
        const response = await fetchReportList({ ...listFilters, page: nextPage, pageSize });
        if (listLoadSequenceRef.current !== loadSequence) {
          logStaleResponse(nextPage);
          return;
        }
        const nextRows = normalizeReportListResponseRows(response.rows);
        const responsePage = Number(response.page ?? nextPage);
        const responseHasMore =
          Boolean(response.hasNextPage) &&
          nextRows.length >= Number(response.pageSize ?? pageSize);
        listRowIdsRef.current = new Set(nextRows.map((row) => row.report_id).filter(Boolean));
        setHasNextPage(responseHasMore);
        setTotalCount(Number(response.total ?? 0));
        setPage(responsePage);
        setListRows(reset ? nextRows : (current) => [...current, ...nextRows.filter((row) => !current.some((existing) => existing.report_id === row.report_id))]);
      } catch (err) {
        if (listLoadSequenceRef.current === loadSequence) {
          setListError(err instanceof Error ? err.message : "Unable to load reports.");
        }
      } finally {
        if (listLoadSequenceRef.current === loadSequence) {
          listPageRequestInFlightRef.current = false;
          setListLoading(false);
        }
      }
    }
    void loadPage(1, true);
    return () => {
      if (listLoadSequenceRef.current === loadSequence) {
        listLoadSequenceRef.current += 1;
        listPageRequestInFlightRef.current = false;
        setListLoading(false);
      }
    };
  }, [isPortalAccessAllowed, listFilters, listUserScopeId, organizationId, pageSize, reloadToken, sessionStatus]);

  const loadNextPage = useCallback(() => {
    if (listLoading || !hasNextPage || listPageRequestInFlightRef.current) return;
    void (async () => {
      const requestSequence = listLoadSequenceRef.current;
      listPageRequestInFlightRef.current = true;
      setListLoading(true);
      setListError(null);
      await fetchReportList({ ...listFilters, page: page + 1, pageSize }).then((response) => {
        if (listLoadSequenceRef.current !== requestSequence) return;
        const responsePage = Number(response.page ?? page + 1);
        const nextRows = normalizeReportListResponseRows(response.rows);
        const uniqueRows = nextRows.filter((row) => {
          const reportId = row.report_id;
          return reportId && !listRowIdsRef.current.has(reportId);
        });
        uniqueRows.forEach((row) => {
          if (row.report_id) listRowIdsRef.current.add(row.report_id);
        });
        const madeProgress = responsePage > page && uniqueRows.length > 0;
        const responseHasMore =
          Boolean(response.hasNextPage) &&
          madeProgress &&
          nextRows.length >= Number(response.pageSize ?? pageSize);
        setHasNextPage(responseHasMore);
        setTotalCount(Number(response.total ?? 0));
        setPage(responsePage > page ? responsePage : page);
        if (uniqueRows.length > 0) {
          setListRows((current) => [...current, ...uniqueRows]);
        }
      }).catch((err) => {
        if (listLoadSequenceRef.current !== requestSequence) return;
        setListError(err instanceof Error ? err.message : "Unable to load more reports.");
      }).finally(() => {
        if (listLoadSequenceRef.current !== requestSequence) return;
        listPageRequestInFlightRef.current = false;
        setListLoading(false);
      });
    })();
  }, [hasNextPage, listFilters, listLoading, page, pageSize]);

  const clearDamageFilters = useCallback(() => {
    setActiveDamageFilterKeys([]);
    setInspectionTypeSearch("");
    setInspectionTypeSuggestionsOpen(false);
    portalFilters.resetFilters("push");
  }, [portalFilters]);
  const availableDamageFilterOptions = useMemo(
    () =>
      DAMAGE_FILTER_OPTIONS.filter(
        (option) => !activeDamageFilterKeys.includes(option.key) && !(hideFacilitySelector && option.key === "facility")
      ),
    [activeDamageFilterKeys, hideFacilitySelector]
  );
  const removeDamageFilter = useCallback((key: DamageReportFilterKey) => {
    setActiveDamageFilterKeys((current) => current.filter((filterKey) => filterKey !== key));
    if (key === "facility") setFacilityFilter("all");
    if (key === "report_id") setReportIdFilter("");
    if (key === "vin") setVinFilter("");
    if (key === "inspection_type") setInspectionTypeFilter("");
    if (key === "make") setMakeFilter("");
    if (key === "model") setModelFilter("");
    if (key === "yard") setYardFilter("");
    if (key === "inspector_email") setInspectorEmailFilter("");
    if (key === "status") setStatusFilter("");
    if (key === "severity") setSeverityFilter("");
    if (key === "damage_area") setDamageAreaFilter("");
    if (key === "damage_type") setDamageTypeFilter("");
    if (key === "date_range") {
      portalFilters.updateFilters({ dateFrom: undefined, dateTo: undefined });
    }
  }, [portalFilters, setDamageAreaFilter, setDamageTypeFilter, setFacilityFilter, setInspectionTypeFilter, setInspectorEmailFilter, setMakeFilter, setModelFilter, setReportIdFilter, setSeverityFilter, setStatusFilter, setVinFilter, setYardFilter]);
  const selectedDamageReportComment = useMemo(() => {
    if (!selectedDamageFullRow) {
      return "";
    }
    const overviewComment = selectedDamageFullRow.overview?.comments?.trim();
    const reportComment = selectedDamageFullRow.comments?.trim();
    return overviewComment || reportComment || "";
  }, [selectedDamageFullRow]);

  useEffect(() => {
    if (!hideFacilitySelector) {
      return;
    }
    setActiveDamageFilterKeys((current) => current.filter((key) => key !== "facility"));
    setFacilityFilter("all");
  }, [hideFacilitySelector]);

  useEffect(() => {
    if (selectedDamageReportIds.length === 0) {
      if (selectedDamageReportId !== null) {
        setSelectedDamageReportId(null);
      }
      return;
    }
    if (selectedDamageReportIds.length === 1) {
      if (selectedDamageReportId !== selectedDamageReportIds[0]) {
        setSelectedDamageReportId(selectedDamageReportIds[0]);
      }
      return;
    }
    if (selectedDamageReportId && !selectedDamageReportIds.includes(selectedDamageReportId)) {
      setSelectedDamageReportId(selectedDamageReportIds[0]);
    }
  }, [selectedDamageReportId, selectedDamageReportIds]);

  useEffect(() => {
    setBrokenDamagePhotoUrls({});
  }, [selectedDamageReportId]);

  useEffect(() => {
    setActiveDamagePhotoUrl(null);
  }, [selectedDamageReportId]);

  const selectedDamageAttachedMedia = useMemo(
    () => selectedDamagePhotos.filter((url) => !brokenDamagePhotoUrls[url]),
    [brokenDamagePhotoUrls, selectedDamagePhotos]
  );
  useEffect(() => {
    if (!isDamageEditOpen || !selectedDamageFullRow) {
      return;
    }
    setDamageEditDraft(buildDamageReportEditDraft(selectedDamageFullRow));
    setDamageEditStatus("Edit the report details and save changes when ready.");
  }, [isDamageEditOpen, selectedDamageFullRow]);

  const openDamageReportEditor = useCallback(() => {
    if (!selectedDamageFullRow) {
      return;
    }
    setDamageEditDraft(buildDamageReportEditDraft(selectedDamageFullRow));
    setDamageEditStatus(null);
    setIsDamageEditOpen(true);
  }, [selectedDamageFullRow]);

  const closeDamageReportEditor = useCallback(() => {
    setIsDamageEditOpen(false);
    setDamageEditDraft(null);
    setDamageEditStatus(null);
  }, []);

  const updateDamageEditEntry = useCallback(
    (entryId: string, patch: Partial<DamageReportEditEntryDraft>) => {
      setDamageEditDraft((current) => {
        if (!current) return current;
        return {
          ...current,
          entries: current.entries.map((entry) =>
            entry.entryId === entryId ? { ...entry, ...patch } : entry
          ),
        };
      });
    },
    []
  );

  const updateDamageEditField = useCallback(
    (field: keyof Omit<DamageReportEditDraft, "entries">, value: string) => {
      setDamageEditDraft((current) => {
        if (!current) return current;
        return {
          ...current,
          [field]: value,
        };
      });
    },
    []
  );

  const saveDamageReportEditor = useCallback(async () => {
    if (!selectedDamageFullRow || !damageEditDraft) {
      return;
    }
    setDamageEditStatus("Saving changes...");
    try {
      const payload = {
        report_id: damageEditDraft.reportId || selectedDamageFullRow.report_id,
        vin: damageEditDraft.vin || selectedDamageFullRow.vin || "",
        make: selectedDamageFullRow.make || "",
        model: selectedDamageFullRow.model || "",
        year: selectedDamageFullRow.year || null,
        comments: damageEditDraft.comments,
        bay_location: damageEditDraft.bayLocation,
        navigation: damageEditDraft.navigation,
        damage_entries: damageEditDraft.entries.map((entry) => ({
          damage_entry_id: entry.entryId,
          damage_sequence: entry.damageSequence,
          damage_area_code: entry.damageAreaCode,
          damage_type_code: entry.damageTypeCode,
          severity: entry.severityLevel,
          comments: entry.comments,
        })),
        damage_summary: selectedDamageFullRow.damage_summary ?? [],
        photo_urls: selectedDamageFullRow.photo_urls ?? [],
        splat_urls: selectedDamageFullRow.splat_urls ?? [],
        splatImageUrl: selectedDamageFullRow.splatImageUrl ?? "",
        pdf_url: selectedDamageFullRow.pdf_url ?? selectedDamageFullRow.overview?.pdf_url ?? "",
        status: selectedDamageFullRow.status ?? "open",
      };
      await ReportsAdapter.updateDamageReport(selectedDamageFullRow.report_id, payload);
      setDamageEditStatus("Report saved successfully.");
      setReloadToken((current) => current + 1);
      setIsDamageEditOpen(false);
      setDamageEditDraft(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save damage report.";
      setDamageEditStatus(message);
    }
  }, [damageEditDraft, selectedDamageFullRow]);

  const toggleDamageMultiSelect = useCallback(() => {
    setDamageMultiSelectEnabled((current) => !current);
  }, []);

  const selectDamageReport = useCallback((reportId: string, event?: React.MouseEvent<HTMLTableRowElement>) => {
    const useMultiSelect = damageMultiSelectEnabled || Boolean(event?.ctrlKey || event?.metaKey);
    if (useMultiSelect) {
      setDamageMultiSelectEnabled(true);
      setSelectedDamageReportIds((current) => {
        if (current.includes(reportId)) {
          const next = current.filter((currentId) => currentId !== reportId);
          if (next.length === 1) {
            setSelectedDamageReportId(next[0]);
          }
          return next;
        }
        if (current.length >= 25) {
          setDamageEditStatus("Multi-select is limited to 25 reports.");
          return current;
        }
        const next = [...current, reportId];
        setSelectedDamageReportId(next[0]);
        return next;
      });
      return;
    }
    setSelectedDamageReportIds([reportId]);
    setSelectedDamageReportId(reportId);
    setDamageMultiSelectEnabled(false);
  }, [damageMultiSelectEnabled]);

  const downloadSelectedDamageCsv = useCallback(() => {
    if (selectedDamageReports.length === 0) return;
    const rows = buildFilteredReportCsvRows(selectedDamageReports as unknown as ReportDamageApiRow[], "facility");
    if (rows.length <= 1) return;
    const csv = rows
      .map((row) =>
        row
          .map((value) => {
            const stringValue = value === null || value === undefined ? "" : String(value);
            return `"${stringValue.replace(/"/g, '""')}"`;
          })
          .join(",")
      )
      .join("\n");
    saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `Docudent_damage_selected_${new Date().toISOString().split("T")[0]}.csv`);
  }, [selectedDamageReports]);

  const downloadSelectedDamagePdfZip = useCallback(async () => {
    if (selectedDamageReports.length === 0) return;
    setIsDownloadingSelectedPdf(true);
    try {
      const zip = new JSZip();
      const fetched: Array<{ vin: string; bytes: Uint8Array } | null> = await Promise.all(
        selectedDamageReports.map(async (report) => {
          const pdfUrl = ReportsAdapter.resolveDamageReportPdfUrl(report as unknown as ReportDamageApiRow);
          if (!pdfUrl) return null;
          const response = await fetch(pdfUrl);
          if (!response.ok) return null;
          return {
            vin: report.vin?.trim() || "",
            bytes: new Uint8Array((await response.arrayBuffer()) as ArrayBuffer),
          };
        })
      );
      const added = fetched.filter((entry): entry is { vin: string; bytes: Uint8Array } => Boolean(entry?.vin && entry?.bytes?.length));
      if (added.length === 0) return;
      added.forEach((entry) => {
        zip.file(`${entry.vin}.pdf`, entry.bytes);
      });
      const blob = await zip.generateAsync({ type: "blob" });
      saveAs(blob, `Docudent_damage_selected_pdfs_${new Date().toISOString().split("T")[0]}.zip`);
    } finally {
      setIsDownloadingSelectedPdf(false);
    }
  }, [selectedDamageReports]);

  const handleDamageSort = useCallback((columnId: "severity" | "created") => {
    setDamageSortDirections((currentDirections) => {
      const nextDirection =
        damageSortFieldRef.current === columnId
          ? currentDirections[columnId] === "asc"
            ? "desc"
            : "asc"
          : columnId === "created"
            ? "desc"
            : "asc";
      return {
        ...currentDirections,
        [columnId]: nextDirection,
      };
    });
    setDamageSortField(columnId);
  }, []);
  const damageFilterInputClass =
    "h-8 w-44 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300";
  const wideDamageFilterInputClass =
    "h-8 w-64 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-300";
  const renderDamageFilterControl = (key: DamageReportFilterKey) => {
    if (key === "facility") {
      if (hideFacilitySelector) {
        return null;
      }
      return (
        <div className="w-52">
          <FacilitySelector facilities={facilityChoices} value={facilityFilter} onChange={setFacilityFilter} />
        </div>
      );
    }
    if (key === "report_id") {
      return (
        <input
          type="search"
          placeholder="Report ID"
          value={reportIdFilter}
          onChange={(event) => setReportIdFilter(event.target.value)}
          className={damageFilterInputClass}
        />
      );
    }
    if (key === "vin") {
      return (
        <div className="relative w-64 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="VIN"
            value={vinFilter}
            onChange={(event) => setVinFilter(event.target.value.toUpperCase())}
            className={`${damageFilterInputClass} sticky top-0 w-full pl-9`}
          />
        </div>
      );
    }
    if (key === "inspection_type") {
      return (
        <div className="relative w-96">
          <input
            type="search"
            placeholder="Type inspection number or name"
            value={inspectionTypeSearch}
            onChange={(event) => {
              const nextSearch = event.target.value;
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
      return (
        <select value={makeFilter} onChange={(event) => setMakeFilter(event.target.value)} className={damageFilterInputClass} aria-label="Make">
          <option value="">All makes</option>
          {includeSelectedFacetOption(filterFacetResponse?.facets.makes ?? [], makeFilter).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }
    if (key === "model") {
      return (
        <select value={modelFilter} onChange={(event) => setModelFilter(event.target.value)} className={damageFilterInputClass} aria-label="Model">
          <option value="">All models</option>
          {includeSelectedFacetOption(filterFacetResponse?.facets.models ?? [], modelFilter).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }
    if (key === "yard") {
      return (
        <select value={yardFilter} onChange={(event) => setYardFilter(event.target.value)} className={damageFilterInputClass}>
          <option value="">All yards</option>
          {yardChoices.map((yard) => (
            <option key={yard.value} value={yard.value}>
              {yard.label}
            </option>
          ))}
        </select>
      );
    }
    if (key === "inspector_email") {
      return (
        <select value={inspectorEmailFilter} onChange={(event) => setInspectorEmailFilter(event.target.value)} className={wideDamageFilterInputClass}>
          <option value="">All inspectors</option>
          {inspectorChoices.map((user) => (
            <option key={user.email} value={user.email}>
              {user.label}
            </option>
          ))}
        </select>
      );
    }
    if (key === "status") {
      return (
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={damageFilterInputClass}>
          <option value="">All statuses</option>
          {includeSelectedFacetOption(filterFacetResponse?.facets.statuses ?? [], statusFilter).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }
    if (key === "severity") {
      return (
        <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className={damageFilterInputClass} aria-label="Severity">
          <option value="">All severities</option>
          {includeSelectedFacetOption(filterFacetResponse?.facets.severities ?? [], severityFilter).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }
    if (key === "damage_area") {
      return (
        <select value={damageAreaFilter} onChange={(event) => setDamageAreaFilter(event.target.value)} className={wideDamageFilterInputClass} aria-label="Damage area">
          <option value="">All damage areas</option>
          {includeSelectedFacetOption(filterFacetResponse?.facets.damageAreas ?? [], damageAreaFilter).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }
    if (key === "damage_type") {
      return (
        <select value={damageTypeFilter} onChange={(event) => setDamageTypeFilter(event.target.value)} className={wideDamageFilterInputClass} aria-label="Damage type">
          <option value="">All damage types</option>
          {includeSelectedFacetOption(filterFacetResponse?.facets.damageTypes ?? [], damageTypeFilter).map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }
    if (key === "date_range") {
      return (
        <ReportDateRangeFilter
          value={{ createdFrom, createdTo }}
          onChange={({ createdFrom: nextFrom, createdTo: nextTo }) => {
            portalFilters.updateFilters({ dateFrom: nextFrom || undefined, dateTo: nextTo || undefined });
          }}
          label="Select date"
        />
      );
    }
    return null;
  };

  if (sessionStatus === "unauthenticated") {
    return (
      <EmptyState
        title="Authentication Required"
        description="Please log in to view damage reports."
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)]">
        <div className="border-b border-blue-200/80 bg-gradient-to-r from-blue-50 via-blue-50/80 to-blue-100/60 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-sm text-slate-600">Browse reports, inspect details, and export the visible set.</p>
            </div>
            <Badge variant="secondary" className="w-fit border-blue-300 bg-white text-blue-800 shadow-sm">
              Reports: {sortedDamageSummaries.length}
            </Badge>
          </div>
          {portalFilters.hasInvalidFilters ? (
            <div role="alert" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">
              Some URL filters were rejected: {portalFilters.issues.map((issue) => issue.message).join(" ")}
            </div>
          ) : null}
          {rejectedFacetFilterNotice ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-950">
              <span>{rejectedFacetFilterNotice}</span>
              <button type="button" className="underline" onClick={() => setRejectedFacetFilterNotice(null)}>Dismiss</button>
            </div>
          ) : null}
          {filterFacetError ? (
            <div role="alert" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-900">
              <span>Filter options could not be loaded. Existing selections remain active; no row-derived fallback was used.</span>
              <button type="button" className="underline" onClick={() => void refreshFilterFacets()}>Retry filter options</button>
            </div>
          ) : filterFacetsLoading ? (
            <p className="mt-2 text-xs text-slate-500" aria-live="polite">Loading authorized filter options…</p>
          ) : null}
        </div>
        <CardContent className="p-0">
          <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(420px,0.85fr)] lg:items-start">
            <div className="sticky top-24 h-[calc(100vh-7rem)] min-h-0 self-start">
              <Card className="flex h-full min-h-0 flex-col overflow-hidden border-blue-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(255,255,255,0.96)_100%)] shadow-[0_18px_60px_-34px_rgba(15,23,42,0.25)]">
                <div className="sticky top-0 z-30 border-b border-blue-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(219,234,254,0.92)_100%)] px-5 py-4 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Inspection Reports</p>
                      <p className="text-sm font-semibold text-slate-700">Scroll independently from the page</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="border-blue-300 bg-white text-blue-800 shadow-sm">
                        Reports: {sortedDamageSummaries.length}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-2 border-black bg-white text-black hover:bg-slate-100 data-[state=on]:bg-slate-900 data-[state=on]:text-white"
                        onClick={toggleDamageMultiSelect}
                      >
                        <ListFilter className="h-4 w-4" />
                        Multi-select
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="relative min-w-56 flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="search"
                        placeholder="Search reports..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-9 w-full rounded-xl border-slate-200 bg-white pl-9 shadow-sm"
                      />
                    </div>
                    <DropdownMenu open={damageFilterMenuOpen} onOpenChange={setDamageFilterMenuOpen}>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="gap-2 border-black bg-white text-black hover:bg-slate-100 data-[state=open]:bg-slate-900 data-[state=open]:text-white">
                          <Filter className="h-4 w-4" />
                          + Add filter
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-72">
                        <DropdownMenuLabel>Available filters</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {availableDamageFilterOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.key}
                            onSelect={() => {
                              setActiveDamageFilterKeys((current) => (current.includes(option.key) ? current : [...current, option.key]));
                              setDamageFilterMenuOpen(false);
                            }}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setDamageFilterMenuOpen(false);
                        clearDamageFilters();
                      }}
                      className="border-black bg-white text-black hover:bg-slate-100"
                    >
                      <FilterX className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setReloadToken((current) => current + 1)}
                      disabled={listLoading}
                      title={listLoading ? "Refresh in progress" : "Refresh reports"}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${listLoading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const rows = buildFilteredReportCsvRows(filteredDamageReports as unknown as ReportDamageApiRow[], "facility");
                        if (rows.length <= 1) return;
                        const csv = rows
                          .map((row) =>
                            row
                              .map((value) => {
                                const stringValue = value === null || value === undefined ? "" : String(value);
                                return `"${stringValue.replace(/"/g, '""')}"`;
                              })
                              .join(",")
                          )
                          .join("\n");
                        saveAs(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `Docudent_damage_${new Date().toISOString().split("T")[0]}.csv`);
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </Button>
                  </div>
                  {activeDamageFilterKeys.length ? (
                    <>
                      <Separator className="my-4" />
                      <div className="flex flex-wrap items-center gap-2">
                        {activeDamageFilterKeys.filter((key) => !(hideFacilitySelector && key === "facility")).map((key) => {
                          const label = DAMAGE_FILTER_OPTIONS.find((option) => option.key === key)?.label ?? key;
                          return (
                            <div key={key} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                              <span className="w-24 shrink-0 truncate text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                              {renderDamageFilterControl(key)}
                              <button
                                type="button"
                                onClick={() => removeDamageFilter(key)}
                                className="mt-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
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
                </div>
                <CardContent className="min-h-0 flex-1 p-0">
                  <ScrollArea
                    className="h-full"
                    onScrollCapture={(event) => {
                      const target = event.currentTarget;
                      if (!target || listLoading || !hasNextPage) return;
                      const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
                      if (distanceFromBottom < 240) {
                        loadNextPage();
                      }
                    }}
                  >
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur">
                        <TableRow className="bg-slate-50/95">
                          {[
                            "VIN",
                            ...(!hideFacilityColumn ? ["Facility"] : []),
                            { id: "severity", label: "Severity", sortable: true },
                            "Status",
                            { id: "created", label: "Created", sortable: true },
                          ].map((column) => {
                            const columnDef = typeof column === "string" ? { id: column.toLowerCase(), label: column } : column;
                            const sortable = Boolean((column as { sortable?: boolean }).sortable);
                            const isActive = damageSortField === columnDef.id;
                            return (
                              <TableHead
                                key={columnDef.id}
                                className={`${
                                  columnDef.id === "severity" || columnDef.id === "created"
                                    ? "cursor-pointer"
                                    : ""
                                } ${columnDef.id === "created" ? "w-44" : ""}`}
                                onClick={() => {
                                  if (sortable) {
                                    handleDamageSort(columnDef.id as "severity" | "created");
                                  }
                                }}
                              >
                                <span className="inline-flex items-center gap-1.5">
                                  {columnDef.label}
                                  {sortable ? (
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                      {isActive ? (damageSortDirections[damageSortField] === "asc" ? "↑" : "↓") : "↕"}
                                    </span>
                                  ) : null}
                                </span>
                              </TableHead>
                            );
                          })}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {listLoading && listRows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={hideFacilityColumn ? 4 : 5} className="py-10">
                              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Loading reports...
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : listError ? (
                          <TableRow>
                            <TableCell colSpan={hideFacilityColumn ? 4 : 5} className="py-10">
                              <div className="space-y-2 text-center">
                                <div className="text-sm font-semibold text-rose-600">Damage reports could not be loaded.</div>
                                <div className="break-all whitespace-normal text-xs text-rose-500">{listError}</div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : sortedDamageSummaries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={hideFacilityColumn ? 4 : 5} className="py-10">
                              <div className="space-y-4">
                                <EmptyState title="No Reports Found" description="No matching reports in the rows loaded so far." />
                                {hasNextPage ? (
                                  <div className="flex justify-center">
                                    <Button type="button" variant="outline" size="sm" onClick={loadNextPage} disabled={listLoading}>
                                      <RefreshCw className={`mr-2 h-4 w-4 ${listLoading ? "animate-spin" : ""}`} />
                                      Load next rows
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : (
                          <>
                            {sortedDamageSummaries.map((entry) => {
                            const isSelected = entry.id === selectedDamageReportId;
                            const isMultiSelected = selectedDamageReportIds.includes(entry.id);
                            const rowTone = isMultiSelected ? "bg-blue-50/80" : "bg-white";
                            return (
                              <TableRow
                                key={entry.id}
                                data-state={isMultiSelected ? "selected" : undefined}
                                className={`cursor-pointer transition-colors hover:bg-slate-50 ${rowTone}`}
                                onClick={(event) => selectDamageReport(entry.id, event)}
                              >
                                <TableCell className={`font-mono text-sm ${isMultiSelected ? "border-l-4 border-l-blue-600 bg-blue-50/80 font-semibold text-slate-950" : "text-slate-600"}`}>
                                  {entry.vin || "VIN unavailable"}
                                </TableCell>
                                {!hideFacilityColumn ? (
                                  <TableCell className={`text-sm break-all ${isMultiSelected ? "bg-blue-50/80 font-medium text-slate-950" : "text-slate-600"}`}>
                                    {entry.locationName}
                                  </TableCell>
                                ) : null}
                                <TableCell className={isMultiSelected ? "bg-blue-50/80" : ""}>
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${severityPillClass(entry.severity)}`}>
                                    {entry.severity && entry.severity !== "n/a" ? resolveSeverityLabel(entry.severity) : "N/A"}
                                  </span>
                                </TableCell>
                                <TableCell className={isMultiSelected ? "bg-blue-50/80" : ""}>
                                  <StatusBadge label={entry.status} tone={toneForReportStatus(entry.status)} />
                                </TableCell>
                                <TableCell className={`text-sm ${isMultiSelected ? "bg-blue-50/80 font-medium text-slate-950" : "text-slate-600"}`}>
                                  {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "N/A"}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                            {listLoading ? (
                              <TableRow>
                                <TableCell colSpan={hideFacilityColumn ? 4 : 5} className="py-6">
                                  <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                    Loading more...
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : hasNextPage ? (
                              <TableRow>
                                <TableCell colSpan={hideFacilityColumn ? 4 : 5} className="py-5">
                                  <div className="flex justify-center">
                                    <Button type="button" variant="outline" size="sm" onClick={loadNextPage}>
                                      Load next rows
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : null}
                          </>
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            <div className="sticky top-24 h-[calc(100vh-7rem)] min-h-0 self-start">
              {selectedDamageReportsCount > 1 ? (
                <Card className="flex h-full min-h-0 flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_24px_70px_-34px_rgba(15,23,42,0.24)]">
                  <div className="h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />
                  <div className="border-b border-slate-200/80 bg-gradient-to-br from-blue-50/90 via-white to-slate-50 px-5 py-4 text-center">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Multiple Reports Selected</p>
                      <h3 className="text-xl font-black tracking-tight text-slate-950">{selectedDamageReportsCount} reports selected</h3>
                      <p className="text-sm text-slate-600">Use the downloads below for the selected VINs only.</p>
                      <div className="flex flex-wrap justify-center gap-2 pt-2">
                        {selectedDamageReportVins.map((vin) => (
                          <Badge key={vin} variant="secondary" className="rounded-full border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                            {vin}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="min-h-0 flex-1 p-5">
                    <div className="space-y-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="h-11 gap-2 px-4 mx-auto flex"
                        disabled={isDownloadingSelectedPdf || selectedDamageReportsCount === 0}
                        onClick={() => void downloadSelectedDamagePdfZip()}
                      >
                        <Download className="h-4 w-4" />
                        {isDownloadingSelectedPdf ? "Preparing PDFs..." : "Download PDFs"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="h-11 gap-2 px-4 mx-auto flex"
                        disabled={isDownloadingSelectedCsv || selectedDamageReportsCount === 0}
                        onClick={() => {
                          setIsDownloadingSelectedCsv(true);
                          try {
                            downloadSelectedDamageCsv();
                          } finally {
                            setIsDownloadingSelectedCsv(false);
                          }
                        }}
                      >
                        <FileText className="h-4 w-4" />
                        Download CSV
                      </Button>
                    </div>
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Selection limit</p>
                      <p className="mt-1 text-sm text-slate-600">Up to 25 reports can be selected at once.</p>
                    </div>
                  </div>
                </Card>
              ) : selectedDamageFullRow ? (
                <div className="flex h-full min-h-0 flex-col gap-4">
                  <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_24px_70px_-34px_rgba(15,23,42,0.24)]">
                    <div
                      className="h-1.5"
                      style={{
                        background: `linear-gradient(90deg, var(--brand, #2563eb) 0%, color-mix(in srgb, var(--brand, #2563eb) 88%, white) 12%, color-mix(in srgb, var(--brand, #2563eb) 70%, white) 20%, color-mix(in srgb, var(--brand, #2563eb) 48%, white) 32%, color-mix(in srgb, var(--brand, #2563eb) 26%, white) 48%, white 100%)`,
                      }}
                    />
                <div className="bg-gradient-to-br from-blue-50/90 via-white to-slate-50 px-5 py-4 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Selected Report Overview</p>
                      <h3 className="font-mono text-3xl font-black tracking-tight text-slate-950">
                        {selectedDamageFullRow.vin || "VIN unavailable"}
                      </h3>
                      <p className="text-sm font-semibold text-slate-700">
                        {selectedDamageFullRow.make || "Unknown Make"} {selectedDamageFullRow.model || ""}
                        {selectedDamageFullRow.year ? ` ${selectedDamageFullRow.year}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <StatusBadge label={selectedDamageFullRow.status || "open"} tone={toneForReportStatus(selectedDamageFullRow.status || "open")} />
                      {selectedDamageIsClearScan ? (
                        <Badge variant="secondary" className="rounded-full border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                          Damage clear
                        </Badge>
                      ) : null}
                      <Badge variant="secondary" className="rounded-full border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
                        {formatDamageReportTimestamp(selectedDamageClearMeta.timestamp || selectedDamageFullRow.created_at || selectedDamageFullRow.updated_at)}
                      </Badge>
                      {!hideFacilitySelector ? (
                        <Badge variant="secondary" className="rounded-full border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                          {resolveDamageReportLocationName(selectedDamageFullRow)}
                        </Badge>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button type="button" variant="outline" size="lg" className="h-10 gap-2 px-4" onClick={openDamageReportEditor}>
                        <FileEdit className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="h-10 gap-2 px-4"
                        disabled={!selectedDamageFullRow.report_id || !selectedDamagePhotos.length || isDownloadingPhotos}
                        onClick={async () => {
                          if (!selectedDamageFullRow.report_id || isDownloadingPhotos) return;
                          setIsDownloadingPhotos(true);
                          try {
                            await ReportsAdapter.downloadDamageReportPhotosZip(selectedDamageFullRow);
                          } catch (photoError) {
                            setDamageEditStatus(photoError instanceof Error ? photoError.message : "Unable to download report photos.");
                          } finally {
                            setIsDownloadingPhotos(false);
                          }
                        }}
                      >
                        <ImageIcon className="mr-2 h-4 w-4" />
                        Download Photos
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="h-10 gap-2 px-4"
                        disabled={!selectedDamagePdfUrl}
                        onClick={() => {
                          if (!selectedDamagePdfUrl) return;
                          window.open(selectedDamagePdfUrl, "_blank", "noopener,noreferrer");
                        }}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                </div>
                <div
                  className="h-1.5"
                  style={{
                    background: `linear-gradient(90deg, var(--brand, #2563eb) 0%, color-mix(in srgb, var(--brand, #2563eb) 88%, white) 12%, color-mix(in srgb, var(--brand, #2563eb) 70%, white) 20%, color-mix(in srgb, var(--brand, #2563eb) 48%, white) 32%, color-mix(in srgb, var(--brand, #2563eb) 26%, white) 48%, white 100%)`,
                  }}
                />
                  </Card>
                  <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-4 pr-1">
                      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <p className="text-sm font-bold text-slate-900">Damage Descriptions</p>
                            </div>
                            <p className="text-xs font-medium text-slate-500">Overview notes and entry comments</p>
                          </div>
                          <Badge variant="secondary" className="border-slate-200 bg-white text-slate-700">
                            {selectedDamageEntries.length} entry{selectedDamageEntries.length === 1 ? "" : "s"}
                          </Badge>
                        </div>
                        <CardContent className="space-y-4 p-5">
                          {selectedDamageReportComment ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Report comment</p>
                              <p className="mt-1 text-sm leading-6 text-slate-700">{selectedDamageReportComment}</p>
                            </div>
                          ) : null}
                          {selectedDamageIsClearScan ? (
                            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                              <div className="flex items-start gap-3">
                                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                                  <CheckCircle2 className="h-5 w-5" />
                                </span>
                                <div className="min-w-0 flex-1 space-y-3">
                                  <div>
                                    <p className="text-sm font-black text-emerald-950">Damage clear</p>
                                    <p className="mt-1 text-sm leading-6 text-emerald-900">
                                      This was scanned and marked as damage clear.
                                    </p>
                                  </div>
                                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                                    <div className="rounded-xl border border-emerald-200/80 bg-white/70 px-3 py-2">
                                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Scan time</p>
                                      <p className="mt-1 font-semibold text-slate-900">
                                        {formatDamageReportTimestamp(selectedDamageClearMeta.timestamp)}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-emerald-200/80 bg-white/70 px-3 py-2">
                                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Marked by</p>
                                      <p className="mt-1 break-all font-semibold text-slate-900">
                                        {selectedDamageClearMeta.inspectorEmail || "Unavailable"}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-emerald-200/80 bg-white/70 px-3 py-2">
                                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Inventory bay</p>
                                      <p className="mt-1 font-semibold text-slate-900">
                                        {selectedDamageClearMeta.inventoryBay || selectedDamageClearMeta.sector || "Unavailable"}
                                      </p>
                                    </div>
                                    <div className="rounded-xl border border-emerald-200/80 bg-white/70 px-3 py-2">
                                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-700">Confirmed bay</p>
                                      <p className="mt-1 font-semibold text-slate-900">
                                        {selectedDamageClearMeta.confirmedBay || "Unavailable"}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : selectedDamageEntries.length > 0 ? (
                            <div className="space-y-3">
                              {selectedDamageEntries.map((entry, index) => {
                                const entryRecord = entry as unknown as Record<string, unknown>;
                                const area = entry.damage_area || entry.damage_area_code || `Damage area ${index + 1}`;
                                const type = entry.damage_type || entry.damage_type_code || "Damage type not provided";
                                const entryComment = (entry.comments || "").trim();
                                const entrySeverity = toEditSeverityValue(
                                  entryRecord.severity ??
                                    entryRecord.severity_level ??
                                    entryRecord.severityLevel ??
                                    entryRecord.severity_level_code ??
                                    null,
                                );
                                return (
                                  <div key={`${entry.damage_entry_id || index}`} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="space-y-1">
                                        <p className="text-sm font-bold text-slate-900">{area}</p>
                                        <p className="text-sm text-slate-600">{type}</p>
                                      </div>
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${severityPillClass(entrySeverity)}`}>
                                        {entrySeverity ? resolveSeverityLabel(entrySeverity) : "Severity unavailable"}
                                      </span>
                                    </div>
                                    {entryComment ? (
                                      <p className="mt-2 text-sm leading-6 text-slate-600">{entryComment}</p>
                                    ) : (
                                      <p className="mt-2 text-sm leading-6 text-slate-500">No description added for this entry.</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center">
                              <p className="text-sm font-medium text-slate-600">No damage descriptions captured.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-blue-600" />
                              <p className="text-sm font-bold text-slate-900">Damage Photos</p>
                            </div>
                            <p className="text-xs font-medium text-slate-500">Attached media</p>
                          </div>
                          <Badge variant="secondary" className="border-slate-200 bg-white text-slate-700">
                            {selectedDamageAttachedMedia.length} item{selectedDamageAttachedMedia.length === 1 ? "" : "s"}
                          </Badge>
                        </div>
                        <CardContent className="p-5">
                          {selectedDamageAttachedMedia.length > 0 ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {selectedDamageAttachedMedia.map((url, index) => (
                                <button
                                  key={`${url}-${index}`}
                                  type="button"
                                  onClick={() => setActiveDamagePhotoUrl(url)}
                                  className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition hover:border-slate-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                                  aria-label={`Open damage photo ${index + 1} fullscreen`}
                                >
                                  <img
                                    src={url}
                                    alt={`Damage photo ${index + 1}`}
                                    className="h-48 w-full bg-white object-contain"
                                    onError={() =>
                                      setBrokenDamagePhotoUrls((current) =>
                                        current[url] ? current : { ...current, [url]: true }
                                      )
                                    }
                                  />
                                  <div className="pointer-events-none absolute inset-0 flex items-start justify-end bg-gradient-to-b from-black/20 via-transparent to-transparent p-3 opacity-0 transition group-hover:opacity-100">
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                                      <Maximize2 className="h-3 w-3" />
                                      Fullscreen
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="flex min-h-32 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white px-4 py-8 text-center">
                              <p className="text-sm font-medium text-slate-600">No damage photos attached.</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                      <DamageMapCard report={selectedDamageFullRow} />
                    </div>
                  </ScrollArea>
                </div>
              ) : (
                <div className="flex h-full items-center justify-center">
                  <EmptySelectionPanel
                    title="No Report Selected"
                    description="Select a report from the list to view details."
                    icon={<FileText className="w-8 h-8" />}
                  />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isDamageEditOpen} onOpenChange={(open) => {
        if (open) {
          openDamageReportEditor();
        } else {
          closeDamageReportEditor();
        }
      }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Edit Damage Report</DialogTitle>
            <DialogDescription>
              Adjust the report details locally for now. Backend save wiring will be added after the shape is confirmed.
            </DialogDescription>
          </DialogHeader>

          {damageEditDraft ? (
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Facility</span>
                  <div className="relative">
                    <select
                      value={damageEditDraft.facilityLabel}
                      disabled
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 pr-10 text-sm text-slate-700 shadow-sm opacity-100"
                    >
                      <option value={damageEditDraft.facilityLabel}>{damageEditDraft.facilityLabel}</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">VIN</span>
                  <input
                    type="text"
                    value={damageEditDraft.vin}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                </label>
                <label className="space-y-1 md:col-span-2">
                  <span className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Report Comments</span>
                  <textarea
                    value={damageEditDraft.comments}
                    onChange={(event) => updateDamageEditField("comments", event.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                    placeholder="Add report comments"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Bay Location</span>
                  <input
                    type="text"
                    value={damageEditDraft.bayLocation}
                    onChange={(event) => updateDamageEditField("bayLocation", event.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                    placeholder="Bay location"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Damage Entries</p>
                    <p className="text-xs text-slate-500">Edit type zone and severity for each entry.</p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    {damageEditDraft.entries.length} entries
                  </p>
                </div>

                <div className="space-y-3">
                  {damageEditDraft.entries.map((entry) => {
                    const selectedArea = findDamageAreaByCode(entry.damageAreaCode);
                    const typeOptions = getDamageTypesForArea(entry.damageAreaCode);
                    return (
                      <div key={entry.entryId} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Entry {entry.damageSequence}</p>
                            <p className="text-xs text-slate-500">
                              {selectedArea ? selectedArea.name : "Type zone and severity"}
                            </p>
                          </div>
                          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                            {entry.entryId}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                          <label className="space-y-1">
                            <span className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Type Zone</span>
                            <select
                              value={entry.damageAreaCode}
                              onChange={(event) =>
                                updateDamageEditEntry(entry.entryId, {
                                  damageAreaCode: event.target.value,
                                  damageTypeCode: "",
                                })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                            >
                              <option value="">Select area</option>
                              {DAMAGE_AREAS.map((area) => (
                                <option key={area.code} value={area.code}>
                                  {area.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-1">
                            <span className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Damage Type</span>
                            <select
                              value={entry.damageTypeCode}
                              onChange={(event) =>
                                updateDamageEditEntry(entry.entryId, {
                                  damageTypeCode: event.target.value,
                                })
                              }
                              disabled={!typeOptions.length}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none disabled:bg-slate-50 disabled:text-slate-400"
                            >
                              <option value="">Select damage type</option>
                              {typeOptions.map((typeOption) => (
                                <option key={typeOption.code} value={typeOption.code}>
                                  {typeOption.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <label className="space-y-1">
                            <span className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Severity</span>
                            <select
                              value={entry.severityLevel}
                              onChange={(event) =>
                                updateDamageEditEntry(entry.entryId, {
                                  severityLevel: event.target.value,
                                })
                              }
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                            >
                              {DAMAGE_SEVERITIES.map((severityOption) => (
                                <option key={severityOption.value} value={severityOption.value}>
                                  {severityOption.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        <label className="space-y-1">
                          <span className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">Entry Notes</span>
                          <textarea
                            value={entry.comments}
                            onChange={(event) =>
                              updateDamageEditEntry(entry.entryId, {
                                comments: event.target.value,
                              })
                            }
                            rows={3}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                            placeholder="Add entry notes"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {damageEditStatus ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  {damageEditStatus}
                </div>
              ) : null}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              No damage report selected.
            </div>
          )}

          <DialogFooter>
            <button
              type="button"
              onClick={closeDamageReportEditor}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => void saveDamageReportEditor()}
              disabled={!damageEditDraft || !selectedDamageFullRow}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Save changes
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(activeDamagePhotoUrl)} onOpenChange={(open) => !open && setActiveDamagePhotoUrl(null)}>
        <DialogContent className="max-h-[95vh] max-w-[96vw] overflow-hidden border-slate-200 bg-slate-950 p-0 text-white sm:max-w-[96vw]">
          {activeDamagePhotoUrl ? (
            <div className="relative flex max-h-[95vh] min-h-[60vh] w-full items-center justify-center bg-slate-950 p-4">
              <button
                type="button"
                onClick={() => setActiveDamagePhotoUrl(null)}
                className="absolute right-4 top-4 z-10 rounded-full border border-[color:var(--portal-button-border)] bg-[color:var(--portal-button-bg)] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[color:var(--portal-button-fg)] transition hover:bg-[color:var(--portal-button-bg-hover)]"
              >
                Close
              </button>
              <img
                src={activeDamagePhotoUrl}
                alt="Damage photo fullscreen view"
                className="max-h-[90vh] max-w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <PortalDataInspector
        data={{
          canonicalFilters: portalFilters.query,
          endpointParams: { ...listFilters, page, page_size: pageSize },
          activeEndpoint: "/api/reports/list",
          request: reportRequestDiagnostic.request,
          rowCount: listRows.length,
          totalCount,
          facetSource: filterFacetResponse?.meta.source,
          facetCounts: reportFacetCounts,
          snapshotStatus: "disabled",
          cacheState: "disabled",
          errorCategory: listError ? reportRequestDiagnostic.errorCategory : "none",
          lastUpdated: reportRequestDiagnostic.lastUpdated,
        }}
      />
    </div>
  );
}
