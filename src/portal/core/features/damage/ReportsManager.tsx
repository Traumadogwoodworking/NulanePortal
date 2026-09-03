"use client";
/* eslint-disable @typescript-eslint/no-unused-vars, @next/next/no-img-element, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
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
import { PageLoadingScreen } from "@/components/ui/PageLoadingScreen";
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
import { mergeReportDetailWithListMedia } from "@/lib/reportMedia";
import {
  ReportsAdapter,
  fetchDamageReportDetail,
  fetchReportList,
  sanitizeDamageReportListRows,
} from "@/lib/services/reportService";
import {
  DAMAGE_FILTER_OPTIONS,
  DEFAULT_DAMAGE_REPORT_FILTERS,
  getActiveInspectionTypeOptions,
  type DamageReportFilterKey,
  matchesDamageReportFilters,
  normalizeDamageReportFilters,
  serializeDamageReportFilters,
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
import {
  deriveReportSeverity,
  enrichDamageReportFacility,
  resolveDamageReportLocationName,
  slugForFacilityLabel,
} from "@/lib/reportUtils";
import { usePortalSession } from "@/lib/portalSession";
import { getPortalSuborgValue } from "@/lib/portalOrganizations";
import {
  DAMAGE_AREAS,
  DAMAGE_SEVERITIES,
  getDamageTypeOptionsForArea,
  type DamageAreaOption,
  type DamageTypeOption,
} from "@/lib/docudent/damageTaxonomy";
import { toneForReportStatus } from "@/lib/status";
import { severityPillClass } from "@/lib/severityTheme";
import { getSessionYardOptions } from "@/lib/sessionYards";
import { normalizeReportListRow } from "@/lib/reportNormalizer";
import { getPortalAnalyticsFilterOptions } from "@/lib/analyticsFilterOptions";
import {
  refreshPortalData,
  useDashboardAnalyticsSnapshot,
  useHomeAnalyticsSnapshot,
  useReportFilterOptionsSnapshot,
} from "@/lib/portalData";
import type {
  FacilitySummary,
  PortalSessionLocation,
  ReportDamageApiRow,
  ReportStatus,
  ReportSummary,
} from "@/lib/types";

interface ReportsManagerProps {
  mode: string;
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
  comments?: string | null;
  submittedAt?: string | null;
  overview?: ReportDamageApiRow["overview"];
};

type DamageCondition = "damaged" | "clear";

const DAMAGE_CONDITION_OPTIONS: Array<{ label: string; value: DamageCondition }> = [
  { label: "Damaged", value: "damaged" },
  { label: "Clear", value: "clear" },
];

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

function formatDamageReportTimestampValue(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString([], {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDamageReportTimestamp(value?: string | null): string {
  return formatDamageReportTimestampValue(value) ?? "Unavailable";
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
      "Report ID",
      "Condition",
      "VIN",
      "Make",
      "Model",
      "Year",
      "Inspection Type",
      "Status",
      "Inspector Email",
      "Comments",
      "Submitted At",
      "Created At",
      "Updated At",
      "Yard",
      "Bay",
      "Sector",
      "Navigation",
      "Damage Entries",
    ],
    ...reports.map((report) => {
      const normalized = normalizeReportListRow(report);
      const normalizedReport = {
        ...report,
        vin: normalized.vin || report.vin,
        make: normalized.make || report.make,
        model: normalized.model || report.model,
        year: normalized.year || report.year,
        inspector_email: normalized.inspectorEmail || report.inspector_email,
        created_at: normalized.createdAt || report.created_at,
        updated_at: normalized.updatedAt || report.updated_at,
        location_label: normalized.locationLabel || report.location_label,
        facility: normalized.facilityName || report.facility,
      } as ReportDamageApiRow;
      const facility = resolveDamageReportLocationName(normalizedReport);
      const inspector = normalized.inspectorEmail || report.inspector_email || "Unassigned";
      const overview = report.overview ?? {};
      const clearMeta = getClearInspectionScanMeta(report);
      const bay =
        normalized.bayLocation ||
        clearMeta.confirmedBay ||
        clearMeta.inventoryBay ||
        (typeof overview.bay_location === "string" ? overview.bay_location : "") ||
        normalized.sector;
      return [
        primaryColumn === "facility" ? facility : inspector,
        primaryColumn === "facility" ? inspector : facility,
        normalized.reportId || report.report_id || "",
        getDamageReportCondition(report) === "clear" ? "Clear" : "Damaged",
        normalized.vin || report.vin || "",
        normalized.make || report.make || "",
        normalized.model || report.model || "",
        normalized.year || report.year || "",
        normalized.inspectionTypeNumber || report.inspection_type_number || "",
        normalized.status || report.status || "",
        normalized.inspectorEmail || report.inspector_email || "",
        normalized.comments || report.comments || (typeof overview.comments === "string" ? overview.comments : ""),
        normalized.submittedAt || clearMeta.timestamp || "",
        normalized.createdAt || report.created_at || "",
        normalized.updatedAt || report.updated_at || "",
        normalized.yardName,
        bay,
        normalized.sector || clearMeta.sector,
        typeof overview.navigation === "string"
          ? overview.navigation
          : typeof overview.navigation_text === "string"
            ? overview.navigation_text
            : typeof overview.navigationText === "string"
              ? overview.navigationText
              : report.navigation || "",
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

function getDamageReportCondition(report: ReportDamageApiRow | null): DamageCondition {
  if (!report) return "damaged";
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
  return isInspectionScan && hasClearSignal && entries.length === 0 && summaryEntries.length === 0 ? "clear" : "damaged";
}

function getClearInspectionScanMeta(report: ReportDamageApiRow | null) {
  const record = (report ?? {}) as unknown as Record<string, unknown>;
  const normalized = normalizeReportListRow(report);
  return {
    timestamp:
      normalized.submittedAt ||
      normalized.createdAt ||
      readRecordString(record, ["submitted_at", "submittedAt", "created_at", "createdAt", "updated_at", "updatedAt"]),
    inspectorEmail:
      normalized.inspectorEmail ||
      readRecordString(record, ["submitted_by_email", "submittedByEmail", "inspector_email", "inspectorEmail"]),
    inventoryBay: normalized.inventoryBay || readRecordString(record, ["inventory_bay", "inventoryBay"]),
    confirmedBay: normalized.confirmedBay || readRecordString(record, ["confirmed_bay", "confirmedBay"]),
    bayLocation: normalized.bayLocation || readRecordString(record, ["bay_location", "bayLocation"]),
    sector: normalized.sector || readRecordString(record, ["sector"]),
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
  const reportRecord = report as unknown as Record<string, unknown>;
  const damageSummaryRecord =
    report.damage_summary &&
    typeof report.damage_summary === "object" &&
    !Array.isArray(report.damage_summary)
      ? (report.damage_summary as unknown as Record<string, unknown>)
      : null;
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
    severity:
      reportRecord.severity ??
      damageSummaryRecord?.max_severity ??
      damageSummaryRecord?.maxSeverity ??
      undefined,
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

function normalizeReportListResponseRows(
  rows: unknown[] | undefined,
  locations: readonly PortalSessionLocation[]
): ReportListRow[] {
  return sanitizeDamageReportListRows(rows).map((rawRow) => {
    const row = enrichDamageReportFacility(
      rawRow as unknown as ReportDamageApiRow,
      locations
    ) as ReportListRow;
    const normalized = normalizeReportListRow(row);
    const overview: NonNullable<ReportDamageApiRow["overview"]> =
      row.overview && typeof row.overview === "object" && !Array.isArray(row.overview)
        ? row.overview
        : {};
    return {
      ...row,
      report_id: normalized.reportId || row.report_id,
      vin: normalized.vin || row.vin,
      make: normalized.make || row.make,
      model: normalized.model || row.model,
      year: normalized.year || row.year,
      status: normalized.status || row.status,
      inspector_email: normalized.inspectorEmail || row.inspector_email,
      submitted_at: normalized.submittedAt || row.submitted_at,
      created_at: normalized.createdAt || row.created_at,
      updated_at: normalized.updatedAt || row.updated_at,
      inspection_type_number: normalized.inspectionTypeNumber || row.inspection_type_number,
      damage_status: normalized.damageStatus || row.damage_status,
      scan_status: normalized.scanStatus || row.scan_status,
      entry_kind: normalized.sourceType || row.entry_kind,
      location_id: normalized.facilityId || row.location_id,
      facility_id: normalized.facilityId || row.facility_id,
      location_label: normalized.locationLabel || row.location_label,
      location_name: normalized.locationLabel || row.location_name,
      facility: normalized.facilityName || row.facility,
      inventory_bay: normalized.inventoryBay || row.inventory_bay,
      confirmed_bay: normalized.confirmedBay || row.confirmed_bay,
      sector: normalized.sector || row.sector,
      comments: normalized.comments || row.comments,
      overview: {
        ...overview,
        ...(normalized.comments && !overview.comments ? { comments: normalized.comments } : {}),
        ...(normalized.bayLocation && !overview.bay_location ? { bay_location: normalized.bayLocation } : {}),
      },
    } as ReportListRow;
  });
}

export function ReportsManager({ mode }: ReportsManagerProps) {
  const searchParams = useSearchParams();
  const focusedDamageReportId =
    searchParams.get("focus")?.trim() ||
    searchParams.get("report_id")?.trim() ||
    "";
  const {
    organizationId,
    status: sessionStatus,
    isPortalAccessAllowed,
    session,
    locations,
    selectedOrganizationScopeKey,
  } = usePortalSession();
  const organizationScopeParams = useMemo(
    () => ({ suborg: getPortalSuborgValue(selectedOrganizationScopeKey) }),
    [selectedOrganizationScopeKey]
  );
  const { data: baseAnalyticsSnapshot } = useDashboardAnalyticsSnapshot(organizationScopeParams);
  const { data: baseFilterSnapshot } = useHomeAnalyticsSnapshot(organizationScopeParams);
  const { data: reportFilterOptions } = useReportFilterOptionsSnapshot();
  const [damageConditionFilter, setDamageConditionFilter] = useState<DamageCondition | "">("");
  const [facilityFilter, setFacilityFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.facilityFilter);
  const [searchTerm, setSearchTerm] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.searchTerm);
  const [reportIdFilter, setReportIdFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.reportIdFilter);
  const [vinFilter, setVinFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.vinFilter);
  const [inspectionTypeFilter, setInspectionTypeFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.inspectionTypeFilter);
  const [inspectionTypeSearch, setInspectionTypeSearch] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.inspectionTypeFilter);
  const [inspectionTypeSuggestionsOpen, setInspectionTypeSuggestionsOpen] = useState(false);
  const [makeFilter, setMakeFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.makeFilter);
  const [modelFilter, setModelFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.modelFilter);
  const [yardFilter, setYardFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.yardFilter);
  const [inspectorEmailFilter, setInspectorEmailFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.inspectorEmailFilter);
  const [createdFrom, setCreatedFrom] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.createdFrom);
  const [createdTo, setCreatedTo] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.createdTo);
  const [activeDamageFilterKeys, setActiveDamageFilterKeys] = useState<DamageReportFilterKey[]>([]);
  const [damageFilterMenuOpen, setDamageFilterMenuOpen] = useState(false);
  const [damageSortField, setDamageSortField] = useState<"severity" | "created">("created");
  const [damageSortDirections, setDamageSortDirections] = useState<Record<"severity" | "created", "asc" | "desc">>({
    severity: "desc",
    created: "desc",
  });
  const [selectedDamageReportId, setSelectedDamageReportId] = useState<string | null>(
    focusedDamageReportId || null
  );
  const [selectedDamageReportDetail, setSelectedDamageReportDetail] = useState<ReportDamageApiRow | null>(null);
  const [selectedDamageReportIds, setSelectedDamageReportIds] = useState<string[]>(
    focusedDamageReportId ? [focusedDamageReportId] : []
  );
  const [damageMultiSelectEnabled, setDamageMultiSelectEnabled] = useState(false);
  const [isDamageEditOpen, setIsDamageEditOpen] = useState(false);
  const [damageEditDraft, setDamageEditDraft] = useState<DamageReportEditDraft | null>(null);
  const [damageEditStatus, setDamageEditStatus] = useState<string | null>(null);
  const [damageEditSaving, setDamageEditSaving] = useState(false);
  const [damageSaveNotice, setDamageSaveNotice] = useState<{
    tone: "success" | "warning";
    message: string;
  } | null>(null);
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
  const [isDamageFilterLoading, setIsDamageFilterLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listSort, setListSort] = useState("created_at_desc");
  const [reloadToken, setReloadToken] = useState(0);
  const hideFacilitySelector = (session?.organization?.name ?? "").trim().toLowerCase() === "free tier organization";
  const hideFacilityColumn = hideFacilitySelector;
  const debouncedBackendSearch = useDebouncedValue(searchTerm, 300);
  const debouncedReportIdFilter = useDebouncedValue(reportIdFilter, 300);
  const debouncedVinFilter = useDebouncedValue(vinFilter, 300);
  const debouncedMakeFilter = useDebouncedValue(makeFilter, 300);
  const debouncedModelFilter = useDebouncedValue(modelFilter, 300);
  const debouncedInspectorEmailFilter = useDebouncedValue(inspectorEmailFilter, 300);
  const fullFilterOptions = useMemo(
    () =>
      getPortalAnalyticsFilterOptions(
        baseFilterSnapshot,
        baseAnalyticsSnapshot,
        reportFilterOptions
      ),
    [baseAnalyticsSnapshot, baseFilterSnapshot, reportFilterOptions]
  );
  const selectedFacilityBackendValue = useMemo(() => {
    if (facilityFilter === "all" || facilityFilter === "other") return undefined;
    const selectedLabel = normalizeFacilityChoiceLabel(facilityFilter).toLowerCase();
    const analyticsOption = fullFilterOptions.facilities.find(
      (option) => normalizeFacilityChoiceLabel(option.label).toLowerCase() === selectedLabel
    );
    if (analyticsOption?.value) return analyticsOption.value;
    const matchingRow = listRows.find((row) => {
      const normalized = normalizeReportListRow(row);
      const rowLabel = normalizeFacilityChoiceLabel(
        normalized.locationLabel ||
          normalized.facilityName ||
          row.location_label ||
          row.location_name ||
          row.facility ||
          ""
      );
      return rowLabel.toLowerCase() === selectedLabel;
    });
    if (!matchingRow) return undefined;
    const normalized = normalizeReportListRow(matchingRow);
    return String(normalized.facilityId || matchingRow.location_id || matchingRow.facility_id || "") || undefined;
  }, [facilityFilter, fullFilterOptions.facilities, listRows]);

  const isMounted = useRef(true);
  const damageSortFieldRef = useRef(damageSortField);
  const hydratedDamageReportIdsRef = useRef(new Set<string>());
  const listPageRequestInFlightRef = useRef(false);
  const listLoadSequenceRef = useRef(0);
  const hasCompletedInitialListLoadRef = useRef(false);
  const listRowIdsRef = useRef(new Set<string>());
  useEffect(() => {
    damageSortFieldRef.current = damageSortField;
  }, [damageSortField]);

  useEffect(() => {
    setFacilityFilter(DEFAULT_DAMAGE_REPORT_FILTERS.facilityFilter);
    setPage(1);
    setHasNextPage(true);
    setTotalCount(0);
    setListRows([]);
    setSelectedDamageReportId(null);
    setSelectedDamageReportDetail(null);
    setSelectedDamageReportIds([]);
    listRowIdsRef.current.clear();
    hasCompletedInitialListLoadRef.current = false;
  }, [selectedOrganizationScopeKey]);

  useEffect(() => {
    if (mode !== "damage" || !focusedDamageReportId) return;
    setDamageConditionFilter("");
    setSelectedDamageReportDetail(null);
    setSelectedDamageReportId(focusedDamageReportId);
    setSelectedDamageReportIds([focusedDamageReportId]);
    setDamageMultiSelectEnabled(false);
  }, [focusedDamageReportId, mode, selectedOrganizationScopeKey]);
  const listFilters = useMemo(
    () => ({
      suborg: getPortalSuborgValue(selectedOrganizationScopeKey),
      search: debouncedBackendSearch || undefined,
      report_id: debouncedReportIdFilter || undefined,
      vin: debouncedVinFilter || undefined,
      make: debouncedMakeFilter || undefined,
      model: debouncedModelFilter || undefined,
      location_id: selectedFacilityBackendValue,
      inspection_type: inspectionTypeFilter || undefined,
      yard: yardFilter || undefined,
      from: createdFrom || undefined,
      to: createdTo || undefined,
      inspector_email: debouncedInspectorEmailFilter || undefined,
      sort: listSort,
      pageSize,
    }),
    [createdFrom, createdTo, debouncedBackendSearch, debouncedInspectorEmailFilter, debouncedMakeFilter, debouncedModelFilter, debouncedReportIdFilter, debouncedVinFilter, inspectionTypeFilter, listSort, pageSize, selectedFacilityBackendValue, selectedOrganizationScopeKey, yardFilter]
  );
  const activeInspectionTypeOptions = useMemo(() => {
    if (fullFilterOptions.inspectionTypes.length) {
      return fullFilterOptions.inspectionTypes.map((option) => {
        const number = /^\d+$/.test(option.value) ? option.value.padStart(2, "0") : option.value;
        return { number, label: option.label, displayLabel: `${number} - ${option.label}` };
      });
    }
    const loadedOptions = getActiveInspectionTypeOptions(listRows as unknown as ReportDamageApiRow[]);
    if (inspectionTypeFilter && !loadedOptions.some((option) => option.number === inspectionTypeFilter)) {
      return [...loadedOptions, { number: inspectionTypeFilter, label: inspectionTypeFilter, displayLabel: inspectionTypeFilter }];
    }
    return loadedOptions;
  }, [fullFilterOptions.inspectionTypes, inspectionTypeFilter, listRows]);
  const filteredInspectionTypeOptions = useMemo(() => {
    const query = inspectionTypeSearch.trim().toLowerCase();
    if (!query) return activeInspectionTypeOptions;
    return activeInspectionTypeOptions.filter((option) =>
      `${option.number} ${option.label} ${option.displayLabel}`.toLowerCase().includes(query)
    );
  }, [activeInspectionTypeOptions, inspectionTypeSearch]);
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

  const normalizedDamageFilters = useMemo(
    () =>
      normalizeDamageReportFilters({
        facilityFilter,
        searchTerm,
        reportIdFilter,
        vinFilter,
        inspectionTypeFilter,
        makeFilter,
        modelFilter,
        yardFilter,
        inspectorEmailFilter,
        statusFilter: "",
        createdFrom,
        createdTo,
      }),
    [
      createdFrom,
      createdTo,
      facilityFilter,
      inspectionTypeFilter,
      inspectorEmailFilter,
      makeFilter,
      modelFilter,
      yardFilter,
      reportIdFilter,
      searchTerm,
      vinFilter,
    ]
  );
  const damageFilterKey = useMemo(
    () => `${serializeDamageReportFilters(normalizedDamageFilters)}:${damageConditionFilter}`,
    [damageConditionFilter, normalizedDamageFilters]
  );

  const filteredDamageRows = useMemo(
    () =>
      listRows.filter(
        (report) =>
          (!focusedDamageReportId || report.report_id === focusedDamageReportId) &&
          matchesDamageReportFilters(report as unknown as ReportDamageApiRow, normalizedDamageFilters) &&
          (!damageConditionFilter || getDamageReportCondition(report as unknown as ReportDamageApiRow) === damageConditionFilter)
      ),
    [damageConditionFilter, damageFilterKey, focusedDamageReportId, listRows, normalizedDamageFilters]
  );
  const filteredDamageSummaries = useMemo(() => {
    const visibleReportIds = new Set(filteredDamageRows.map((report) => report.report_id));
    return damageSummaries.filter((report) => visibleReportIds.has(report.id));
  }, [damageSummaries, filteredDamageRows]);

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
  const visibleDamageExportRows = useMemo(
    () =>
      sortedDamageSummaries
        .map((summary) => listRows.find((report) => report.report_id === summary.id))
        .filter((report): report is ReportListRow => Boolean(report)),
    [listRows, sortedDamageSummaries]
  );

  const selectedDamageFullRow = useMemo(() => {
    const selectedListRow = listRows.find((row) => row.report_id === selectedDamageReportId) ?? null;
    if (selectedDamageReportDetail?.report_id === selectedDamageReportId && selectedListRow) {
      return mergeReportDetailWithListMedia(
        selectedDamageReportDetail as unknown as Record<string, unknown>,
        selectedListRow as unknown as Record<string, unknown>
      ) as unknown as ReportDamageApiRow;
    }
    return selectedDamageReportDetail?.report_id === selectedDamageReportId
      ? selectedDamageReportDetail
      : (selectedListRow as unknown as ReportDamageApiRow | null);
  }, [listRows, selectedDamageReportDetail, selectedDamageReportId]);
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
  const selectedDamageCondition = useMemo(
    () => getDamageReportCondition(selectedDamageFullRow),
    [selectedDamageFullRow]
  );
  const selectedDamageIsClearScan = selectedDamageCondition === "clear";
  const selectedDamageClearMeta = useMemo(
    () => getClearInspectionScanMeta(selectedDamageFullRow),
    [selectedDamageFullRow]
  );
  const selectedDamageNormalized = useMemo(
    () => normalizeReportListRow(selectedDamageFullRow),
    [selectedDamageFullRow]
  );
  const selectedDamageVehicleDescription = useMemo(
    () =>
      [
        selectedDamageNormalized.make,
        selectedDamageNormalized.model,
        selectedDamageNormalized.year,
      ]
        .filter(Boolean)
        .join(" "),
    [selectedDamageNormalized]
  );
  const selectedDamageTimestampLabel = useMemo(
    () =>
      formatDamageReportTimestampValue(
        selectedDamageClearMeta.timestamp ||
          selectedDamageFullRow?.created_at ||
          selectedDamageFullRow?.updated_at
      ),
    [selectedDamageClearMeta.timestamp, selectedDamageFullRow]
  );
  const selectedClearInspectionFacts = useMemo(
    () =>
      [
        {
          label: "Scan time",
          value: formatDamageReportTimestampValue(selectedDamageClearMeta.timestamp),
        },
        {
          label: "Marked by",
          value: selectedDamageClearMeta.inspectorEmail,
          breakAll: true,
        },
        {
          label: "Inspection type",
          value: selectedDamageNormalized.inspectionTypeLabel || selectedDamageNormalized.inspectionTypeNumber,
        },
        {
          label: "Yard",
          value: selectedDamageNormalized.yardName,
        },
        {
          label: "Bay",
          value:
            selectedDamageClearMeta.bayLocation ||
            selectedDamageClearMeta.confirmedBay ||
            selectedDamageClearMeta.inventoryBay ||
            selectedDamageClearMeta.sector,
        },
        {
          label: "Sector",
          value: selectedDamageClearMeta.sector,
        },
      ].filter((fact): fact is { label: string; value: string; breakAll?: boolean } => Boolean(fact.value)),
    [selectedDamageClearMeta, selectedDamageNormalized]
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
        const rawMatch = await fetchDamageReportDetail(selectedDamageReportId);
        if (cancelled) return;
        hydratedDamageReportIdsRef.current.add(selectedDamageReportId);
        if (rawMatch) {
          const match = enrichDamageReportFacility(rawMatch, locations);
          setSelectedDamageReportDetail(match);
          setSelectedDamageReportId(match.report_id);
          hydratedDamageReportIdsRef.current.add(match.report_id);
          const hydratedListRow = normalizeReportListResponseRows([match], locations)[0] ?? null;
          setListRows((current) => {
            const matchingIndex = current.findIndex(
              (row) => row.report_id === selectedDamageReportId || row.report_id === match.report_id
            );
            if (matchingIndex === -1) {
              if (!hydratedListRow) return current;
              listRowIdsRef.current.add(hydratedListRow.report_id);
              return [hydratedListRow, ...current];
            }
            return current.map((row, index) =>
              index === matchingIndex
                ? ({ ...row, ...match, report_id: match.report_id || row.report_id } as ReportListRow)
                : row
            );
          });
        }
      } catch {
        hydratedDamageReportIdsRef.current.add(selectedDamageReportId);
        // keep the list-row fallback
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locations, selectedDamageFullRow, selectedDamageIsClearScan, selectedDamageReportId]);
  const facilityChoices = useMemo<FacilitySummary[]>(() => {
    const choices = new Map<string, { id: string; label: string; slug: string }>();
    if (fullFilterOptions.facilities.length) {
      fullFilterOptions.facilities.forEach((option) => {
        const label = normalizeFacilityChoiceLabel(option.label);
        const labelKey = label.toLowerCase();
        const id = label === "Other" ? "other" : label;
        if (id && !choices.has(labelKey)) choices.set(labelKey, { id, label, slug: slugForFacilityLabel(label) });
      });
    } else {
      listRows.forEach((row) => {
        const normalized = normalizeReportListRow(row);
        const label = normalizeFacilityChoiceLabel(normalized.locationLabel || normalized.facilityName || row.location_label || row.location_name || row.facility || "");
        const labelKey = label.toLowerCase();
        const id = label === "Other" ? "other" : label;
        if (id && !choices.has(labelKey)) choices.set(labelKey, { id, label, slug: slugForFacilityLabel(label) });
      });
    }
    if (facilityFilter !== "all" && !choices.has(facilityFilter.toLowerCase())) {
      choices.set(facilityFilter.toLowerCase(), { id: facilityFilter, label: facilityFilter, slug: slugForFacilityLabel(facilityFilter) });
    }
    return Array.from(choices.values()).map((choice) => ({
      id: choice.id,
      name: choice.label,
      slug: choice.slug,
      active: true,
      locationCount: 1,
    }));
  }, [facilityFilter, fullFilterOptions.facilities, listRows]);
  const yardChoices = useMemo(() => {
    const choices = new Map<string, string>();
    if (fullFilterOptions.yards.length) {
      fullFilterOptions.yards.forEach((option) => choices.set(option.value, option.label));
    } else {
      getSessionYardOptions(session).forEach((yard) => {
        const label = yard.facilityLabel ? `${yard.facilityLabel} - ${yard.label}` : yard.label;
        choices.set(yard.value, label);
      });
      listRows.forEach((row) => {
        const normalized = normalizeReportListRow(row);
        const value = normalized.yardId || normalized.yardName;
        if (value && !choices.has(value)) choices.set(value, normalized.yardName || value);
      });
    }
    if (yardFilter && !choices.has(yardFilter)) choices.set(yardFilter, yardFilter);
    return Array.from(choices.entries()).map(([value, label]) => ({ value, label }));
  }, [fullFilterOptions.yards, listRows, session, yardFilter]);
  const inspectorChoices = useMemo(() => {
    const usersByEmail = new Map<string, { email: string; label: string }>();
    if (fullFilterOptions.inspectors.length) {
      fullFilterOptions.inspectors.forEach((option) => usersByEmail.set(option.value.toLowerCase(), { email: option.value, label: option.label }));
    } else {
      damageSummaries.forEach((summary) => {
        const email = summary.inspectorEmail?.trim();
        if (!email || usersByEmail.has(email.toLowerCase())) return;
        usersByEmail.set(email.toLowerCase(), { email, label: email });
      });
    }
    if (inspectorEmailFilter && !usersByEmail.has(inspectorEmailFilter.toLowerCase())) {
      usersByEmail.set(inspectorEmailFilter.toLowerCase(), { email: inspectorEmailFilter, label: inspectorEmailFilter });
    }
    return Array.from(usersByEmail.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [damageSummaries, fullFilterOptions.inspectors, inspectorEmailFilter]);
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

  useEffect(() => {
    const loadSequence = listLoadSequenceRef.current + 1;
    listLoadSequenceRef.current = loadSequence;
    const isFilterReplacement = hasCompletedInitialListLoadRef.current;
    setIsDamageFilterLoading(isFilterReplacement);
    async function loadPage(nextPage: number, reset = false) {
      listPageRequestInFlightRef.current = true;
      setListLoading(true);
      setListError(null);
      try {
        const response = await fetchReportList({ ...listFilters, page: nextPage, pageSize });
        if (listLoadSequenceRef.current !== loadSequence) return;
        const nextRows = normalizeReportListResponseRows(response.rows, locations);
        const responsePage = Number(response.page ?? nextPage);
        const responseHasMore =
          Boolean(response.hasNextPage) &&
          nextRows.length >= Number(response.pageSize ?? pageSize);
        listRowIdsRef.current = new Set(nextRows.map((row) => row.report_id).filter(Boolean));
        setHasNextPage(responseHasMore);
        setTotalCount(Number(response.total ?? 0));
        setPage(responsePage);
        setListRows((current) => {
          if (!reset) {
            return [
              ...current,
              ...nextRows.filter(
                (row) => !current.some((existing) => existing.report_id === row.report_id)
              ),
            ];
          }
          if (!focusedDamageReportId) return nextRows;
          const focusedRow = current.find(
            (row) => row.report_id === focusedDamageReportId
          );
          if (
            !focusedRow ||
            nextRows.some((row) => row.report_id === focusedDamageReportId)
          ) {
            return nextRows;
          }
          return [focusedRow, ...nextRows];
        });
        hasCompletedInitialListLoadRef.current = true;
      } catch (err) {
        if (listLoadSequenceRef.current === loadSequence) {
          setListError(err instanceof Error ? err.message : "Unable to load reports.");
        }
      } finally {
        if (listLoadSequenceRef.current === loadSequence) {
          listPageRequestInFlightRef.current = false;
          setListLoading(false);
          setIsDamageFilterLoading(false);
        }
      }
    }
    setPage(1);
    setHasNextPage(true);
    listRowIdsRef.current = new Set();
    void loadPage(1, true);
    return () => {
      if (listLoadSequenceRef.current === loadSequence) {
        listLoadSequenceRef.current += 1;
        listPageRequestInFlightRef.current = false;
        setListLoading(false);
        setIsDamageFilterLoading(false);
      }
    };
  }, [focusedDamageReportId, listFilters, locations, pageSize, reloadToken]);

  const loadNextPage = useCallback(() => {
    if (listLoading || !hasNextPage || listPageRequestInFlightRef.current) return;
    void (async () => {
      const loadSequence = listLoadSequenceRef.current;
      listPageRequestInFlightRef.current = true;
      setListLoading(true);
      setListError(null);
      await fetchReportList({ ...listFilters, page: page + 1, pageSize }).then((response) => {
        if (listLoadSequenceRef.current !== loadSequence) return;
        const responsePage = Number(response.page ?? page + 1);
        const nextRows = normalizeReportListResponseRows(response.rows, locations);
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
        if (listLoadSequenceRef.current !== loadSequence) return;
        setListError(err instanceof Error ? err.message : "Unable to load more reports.");
      }).finally(() => {
        if (listLoadSequenceRef.current === loadSequence) {
          listPageRequestInFlightRef.current = false;
          setListLoading(false);
        }
      });
    })();
  }, [hasNextPage, listFilters, listLoading, locations, page, pageSize]);

  const clearDamageFilters = useCallback(() => {
    setActiveDamageFilterKeys([]);
    setFacilityFilter("all");
    setSearchTerm("");
    setReportIdFilter("");
    setVinFilter("");
    setInspectionTypeFilter("");
    setInspectionTypeSearch("");
    setInspectionTypeSuggestionsOpen(false);
    setMakeFilter("");
    setModelFilter("");
    setYardFilter("");
    setInspectorEmailFilter("");
    setDamageConditionFilter("");
    setCreatedFrom("");
    setCreatedTo("");
  }, []);
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
    if (key === "status") setDamageConditionFilter("");
    if (key === "date_range") {
      setCreatedFrom("");
      setCreatedTo("");
    }
  }, []);
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
    if (!selectedDamageFullRow || !damageEditDraft || damageEditSaving) {
      return;
    }
    setDamageEditSaving(true);
    setDamageSaveNotice(null);
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
      setReloadToken((current) => current + 1);
      try {
        await refreshPortalData(organizationId, ["reports", "analytics"]);
        setDamageSaveNotice({
          tone: "success",
          message: `Report ${selectedDamageFullRow.report_id} saved and refreshed across reports and analytics.`,
        });
      } catch (refreshError) {
        setDamageSaveNotice({
          tone: "warning",
          message: `Report ${selectedDamageFullRow.report_id} was saved, but shared report views could not be refreshed: ${
            refreshError instanceof Error ? refreshError.message : "unknown refresh error"
          }`,
        });
      }
      setIsDamageEditOpen(false);
      setDamageEditDraft(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save damage report.";
      setDamageEditStatus(message);
    } finally {
      setDamageEditSaving(false);
    }
  }, [damageEditDraft, damageEditSaving, organizationId, selectedDamageFullRow]);

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
          <FacilitySelector
            facilities={facilityChoices}
            value={facilityFilter}
            onChange={setFacilityFilter}
            searchable
            showSlug={false}
          />
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
          <input
            type="search"
            placeholder="Make"
            value={makeFilter}
            onChange={(event) => setMakeFilter(event.target.value)}
            className={damageFilterInputClass}
          />
      );
    }
    if (key === "model") {
      return (
          <input
            type="search"
            placeholder="Model"
            value={modelFilter}
            onChange={(event) => setModelFilter(event.target.value)}
            className={damageFilterInputClass}
          />
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
        <select value={damageConditionFilter} onChange={(event) => setDamageConditionFilter(event.target.value as DamageCondition | "")} className={damageFilterInputClass}>
          <option value="">All damage statuses</option>
          {DAMAGE_CONDITION_OPTIONS.map((option) => (
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
            setCreatedFrom(nextFrom);
            setCreatedTo(nextTo);
          }}
          label="Select date"
          minDate={reportDateBounds.minDate}
          maxDate={reportDateBounds.maxDate}
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

  if (
    sessionStatus === "loading" ||
    sessionStatus === "authenticating" ||
    (listLoading && listRows.length === 0)
  ) {
    return (
      <PageLoadingScreen
        title="Loading damage reports"
        description={
          sessionStatus === "loading" || sessionStatus === "authenticating"
            ? "Confirming your portal session..."
            : "Retrieving the latest inspection reports..."
        }
        detail="Preparing report filters, results, and inspection details."
      />
    );
  }

  return (
    <div className="relative space-y-6">
      {damageSaveNotice ? (
        <div
          role={damageSaveNotice.tone === "warning" ? "alert" : "status"}
          aria-live="polite"
          className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
            damageSaveNotice.tone === "warning"
              ? "border-amber-200 bg-amber-50 text-amber-800"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {damageSaveNotice.message}
        </div>
      ) : null}
      {isDamageFilterLoading ? (
        <div className="absolute inset-0 z-[70] rounded-2xl bg-white/85 px-3 pt-4 backdrop-blur-sm">
          <PageLoadingScreen
            title="Applying report filters"
            description="Loading the matching damage submissions..."
            detail="The current batch will be replaced when the filtered response is ready."
          />
        </div>
      ) : null}
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
        </div>
        <CardContent className="p-0">
          <div className="grid gap-6 p-3 sm:p-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(420px,0.85fr)] lg:items-start">
            <div className="min-h-[32rem] min-w-0 self-start xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)] xl:min-h-0">
              <Card className="flex h-[32rem] min-h-0 flex-col overflow-hidden border-blue-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(255,255,255,0.96)_100%)] shadow-[0_18px_60px_-34px_rgba(15,23,42,0.25)] xl:h-full">
                <div className="sticky top-0 z-30 border-b border-blue-200/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98)_0%,rgba(219,234,254,0.92)_100%)] px-5 py-4 backdrop-blur">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-slate-700">Inspection Reports</p>
                      <p className="text-sm font-semibold text-slate-700">Scroll independently from the page</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="border-blue-300 bg-white text-blue-800 shadow-sm">
                        Reports: {sortedDamageSummaries.length}
                      </Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        aria-pressed={damageMultiSelectEnabled}
                        data-state={damageMultiSelectEnabled ? "on" : "off"}
                        className={`gap-2 ${
                          damageMultiSelectEnabled
                            ? "border-blue-800 !bg-blue-700 !font-bold !text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.25),0_4px_12px_rgba(29,78,216,0.28)] hover:!bg-blue-800 hover:!text-white"
                            : "border-black bg-white text-black hover:bg-slate-100"
                        }`}
                        onClick={toggleDamageMultiSelect}
                      >
                        <ListFilter className="h-4 w-4" />
                        Multi-select
                      </Button>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <div className="relative w-full min-w-0 basis-full sm:min-w-56 sm:flex-1 sm:basis-auto">
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
                        const rows = buildFilteredReportCsvRows(
                          visibleDamageExportRows as unknown as ReportDamageApiRow[],
                          "facility"
                        );
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
                      title={`Export the ${visibleDamageExportRows.length} reports currently visible in this loaded batch`}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export {visibleDamageExportRows.length}
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
                              <span className="w-24 shrink-0 truncate text-xs font-black uppercase tracking-widest text-slate-500">{label}</span>
                              {renderDamageFilterControl(key)}
                              <button
                                type="button"
                                onClick={() => removeDamageFilter(key)}
                                className="mt-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900"
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
                                } px-2 text-center text-xs sm:px-4 ${
                                  ["facility", "severity", "created"].includes(columnDef.id) ? "hidden sm:table-cell" : ""
                                } ${columnDef.id === "created" ? "w-[1%] whitespace-nowrap pl-2 pr-4" : ""}`}
                                onClick={() => {
                                  if (sortable) {
                                    handleDamageSort(columnDef.id as "severity" | "created");
                                  }
                                }}
                              >
                                <span className="inline-flex items-center justify-center gap-1.5">
                                  {columnDef.label}
                                  {sortable ? (
                                    <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
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
                            const isMultiSelected = selectedDamageReportIds.includes(entry.id);
                            const damageCondition = getDamageReportCondition(
                              (listRows.find((report) => report.report_id === entry.id) as unknown as ReportDamageApiRow | undefined) ?? null
                            );
                            const rowTone = isMultiSelected ? "bg-blue-50/80" : "bg-white";
                            return (
                              <TableRow
                                key={entry.id}
                                data-state={isMultiSelected ? "selected" : undefined}
                                className={`cursor-pointer transition-colors hover:bg-slate-50 ${rowTone}`}
                                onClick={(event) => selectDamageReport(entry.id, event)}
                              >
                                <TableCell className={`px-2 text-center font-mono text-xs sm:px-4 sm:text-sm ${isMultiSelected ? "border-l-4 border-l-blue-600 bg-blue-50/80 font-semibold text-slate-950" : "text-slate-600"}`}>
                                  <span className="block">{entry.vin || "VIN unavailable"}</span>
                                  {entry.make || entry.model || entry.year ? (
                                    <span className="mt-1 block font-sans text-xs font-semibold text-slate-700">
                                      {[entry.make, entry.model, entry.year].filter(Boolean).join(" ")}
                                    </span>
                                  ) : null}
                                </TableCell>
                                {!hideFacilityColumn ? (
                                  <TableCell className={`hidden break-all text-center text-sm sm:table-cell ${isMultiSelected ? "bg-blue-50/80 font-medium text-slate-950" : "text-slate-600"}`}>
                                    {entry.locationName}
                                  </TableCell>
                                ) : null}
                                <TableCell className={`hidden text-center sm:table-cell ${isMultiSelected ? "bg-blue-50/80" : ""}`}>
                                  {damageCondition === "clear" ? (
                                    <span className="text-sm font-medium text-emerald-800">No damage</span>
                                  ) : (
                                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${severityPillClass(entry.severity)}`}>
                                      {entry.severity && entry.severity !== "n/a" ? resolveSeverityLabel(entry.severity) : "Not recorded"}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className={`text-center ${isMultiSelected ? "bg-blue-50/80" : ""}`}>
                                  <Badge
                                    variant="secondary"
                                    className={`rounded-full px-1.5 py-1 text-xs font-semibold sm:px-2.5 ${
                                      damageCondition === "clear"
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                        : "border-rose-200 bg-rose-50 text-rose-800"
                                    }`}
                                  >
                                    {damageCondition === "clear" ? "Clear" : "Damaged"}
                                  </Badge>
                                </TableCell>
                                <TableCell className={`hidden whitespace-nowrap pl-2 pr-4 text-center text-sm sm:table-cell ${isMultiSelected ? "bg-blue-50/80 font-medium text-slate-950" : "text-slate-600"}`}>
                                  {formatDamageReportTimestamp(entry.createdAt)}
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
            <div className="min-w-0 self-start xl:sticky xl:top-24 xl:h-[calc(100vh-7rem)] xl:min-h-0">
              {selectedDamageReportsCount > 1 ? (
                <Card className="flex h-full min-h-0 flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_24px_70px_-34px_rgba(15,23,42,0.24)]">
                  <div className="h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />
                  <div className="border-b border-slate-200/80 bg-gradient-to-br from-blue-50/90 via-white to-slate-50 px-5 py-4 text-center">
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-slate-700">Multiple Reports Selected</p>
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
                      <p className="text-sm font-semibold text-slate-700">Selection limit</p>
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
                      <p className="text-xs font-bold tracking-wide text-slate-600">Selected report</p>
                      <h3 className="font-mono text-3xl font-black tracking-tight text-slate-950">
                        {selectedDamageFullRow.vin || "VIN unavailable"}
                      </h3>
                      {selectedDamageVehicleDescription ? (
                        <p className="text-sm font-semibold text-slate-700">
                          {selectedDamageVehicleDescription}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <StatusBadge label={selectedDamageFullRow.status || "open"} tone={toneForReportStatus(selectedDamageFullRow.status || "open")} />
                      <Badge
                        variant="secondary"
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          selectedDamageCondition === "clear"
                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                            : "border-rose-200 bg-rose-50 text-rose-800"
                        }`}
                      >
                        {selectedDamageCondition === "clear" ? "Clear" : "Damaged"}
                      </Badge>
                      {selectedDamageTimestampLabel ? (
                        <Badge variant="secondary" className="rounded-full border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
                          {selectedDamageTimestampLabel}
                        </Badge>
                      ) : null}
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
                      {selectedDamagePhotos.length > 0 ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="lg"
                          className="h-10 gap-2 px-4"
                          disabled={!selectedDamageFullRow.report_id || isDownloadingPhotos}
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
                      ) : null}
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
                              <p className="text-base font-bold text-slate-950">
                                {selectedDamageIsClearScan ? "Clear Inspection" : "Damage Descriptions"}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-slate-600">
                              {selectedDamageIsClearScan ? "Verified no-damage result" : "Overview notes and entry comments"}
                            </p>
                          </div>
                          {!selectedDamageIsClearScan ? (
                            <Badge variant="secondary" className="border-slate-200 bg-white text-slate-700">
                              {selectedDamageEntries.length} entry{selectedDamageEntries.length === 1 ? "" : "s"}
                            </Badge>
                          ) : null}
                        </div>
                        <CardContent className="space-y-4 p-5">
                          {selectedDamageReportComment ? (
                            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-sm font-semibold text-slate-700">Report comment</p>
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
                                  {selectedClearInspectionFacts.length > 0 ? (
                                    <dl className="grid gap-2 sm:grid-cols-2">
                                      {selectedClearInspectionFacts.map((fact) => (
                                        <div key={fact.label} className="rounded-xl border border-emerald-200/80 bg-white/70 px-3 py-2">
                                          <dt className="text-sm font-bold text-emerald-800">{fact.label}</dt>
                                          <dd className={`mt-1 text-sm font-medium text-slate-900 ${fact.breakAll ? "break-all" : "break-words"}`}>
                                            {fact.value}
                                          </dd>
                                        </div>
                                      ))}
                                    </dl>
                                  ) : null}
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
                                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider ${severityPillClass(entrySeverity)}`}>
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
                      {!selectedDamageIsClearScan || selectedDamageAttachedMedia.length > 0 ? (
                      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <ImageIcon className="h-4 w-4 text-blue-600" />
                              <p className="text-base font-bold text-slate-950">
                                {selectedDamageIsClearScan ? "Inspection Photos" : "Damage Photos"}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-slate-600">Attached media</p>
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
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-950/80 px-2.5 py-1 text-xs font-black uppercase tracking-[0.22em] text-white">
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
                      ) : null}
                      {!selectedDamageIsClearScan ? <DamageMapCard report={selectedDamageFullRow} /> : null}
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
            <DialogTitle>{selectedDamageIsClearScan ? "Edit Clear Inspection" : "Edit Damage Report"}</DialogTitle>
            <DialogDescription>
              {selectedDamageIsClearScan
                ? "Update the available inspection details without adding damage-only fields."
                : "Update the report details and damage entries."}
            </DialogDescription>
          </DialogHeader>

          {damageEditDraft ? (
            <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-semibold text-slate-700">Facility</span>
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
                  <span className="text-sm font-semibold text-slate-700">VIN</span>
                  <input
                    type="text"
                    value={damageEditDraft.vin}
                    readOnly
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm"
                  />
                </label>
                {!selectedDamageIsClearScan || damageEditDraft.comments ? (
                  <label className="space-y-1 md:col-span-2">
                    <span className="text-sm font-semibold text-slate-700">Report Comments</span>
                    <textarea
                      value={damageEditDraft.comments}
                      onChange={(event) => updateDamageEditField("comments", event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                      placeholder="Add report comments"
                    />
                  </label>
                ) : null}
                {!selectedDamageIsClearScan || damageEditDraft.bayLocation ? (
                  <label className="space-y-1">
                    <span className="text-sm font-semibold text-slate-700">Bay Location</span>
                    <input
                      type="text"
                      value={damageEditDraft.bayLocation}
                      onChange={(event) => updateDamageEditField("bayLocation", event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-300 focus:outline-none"
                      placeholder="Bay location"
                    />
                  </label>
                ) : null}
              </div>

              {!selectedDamageIsClearScan ? (
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
                            <span className="text-sm font-semibold text-slate-700">Type Zone</span>
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
                            <span className="text-sm font-semibold text-slate-700">Damage Type</span>
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
                            <span className="text-sm font-semibold text-slate-700">Severity</span>
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
                          <span className="text-sm font-semibold text-slate-700">Entry Notes</span>
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
              ) : null}

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
              disabled={damageEditSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={() => void saveDamageReportEditor()}
              disabled={!damageEditDraft || !selectedDamageFullRow || damageEditSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {damageEditSaving ? "Saving..." : "Save changes"}
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
                className="absolute right-4 top-4 z-10 rounded-full border border-[color:var(--portal-button-border)] bg-[color:var(--portal-button-bg)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.22em] text-[color:var(--portal-button-fg)] transition hover:bg-[color:var(--portal-button-bg-hover)]"
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
    </div>
  );
}
