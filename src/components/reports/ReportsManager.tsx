"use client";
/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, @next/next/no-img-element */

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
import { normalizeMediaUrl } from "@/lib/config";
import { ReportsAdapter } from "@/lib/services/reportService";
import { usePortalDirectorySnapshot, usePortalReportsSnapshot } from "@/lib/portalData";
import {
  DAMAGE_FILTER_OPTIONS,
  DEFAULT_DAMAGE_REPORT_FILTERS,
  type DamageReportFilterKey,
  matchesDamageReportFilters,
  normalizeDamageReportFilters,
  serializeDamageReportFilters,
} from "@/lib/reportFilters";
import { AuthRedirectError } from "@/lib/portalAuth";
import { saveAs } from "file-saver";
import { 
  Download, 
  FileEdit, 
  FileText, 
  Image as ImageIcon, 
  Maximize2,
  RefreshCw,
  Search,
  Filter,
  FilterX,
  ChevronDown,
} from "lucide-react";
import { resolveDamageReportLocationName, slugForFacilityLabel } from "@/lib/reportUtils";
import { getPortalBranding } from "@/lib/branding";
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
import type {
  FacilitySummary,
  ReportDamageApiRow,
  ReportStatus,
  ReportSummary,
} from "@/lib/types";

interface ReportsManagerProps {
  mode: string;
}

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

export function ReportsManager({ mode }: ReportsManagerProps) {
  const { organizationId, status: sessionStatus, isPortalAccessAllowed } = usePortalSession();
  const { data: directory } = usePortalDirectorySnapshot();
  const { data: reportsSnapshot, mutate: refreshReportsSnapshot } = usePortalReportsSnapshot();
  const [statusFilter, setStatusFilter] = useState<ReportStatus | "">(DEFAULT_DAMAGE_REPORT_FILTERS.statusFilter);
  const [facilityFilter, setFacilityFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.facilityFilter);
  const [searchTerm, setSearchTerm] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.searchTerm);
  const [reportIdFilter, setReportIdFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.reportIdFilter);
  const [vinFilter, setVinFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.vinFilter);
  const [makeFilter, setMakeFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.makeFilter);
  const [modelFilter, setModelFilter] = useState(DEFAULT_DAMAGE_REPORT_FILTERS.modelFilter);
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
  const [selectedDamageReportId, setSelectedDamageReportId] = useState<string | null>(null);
  const [isDamageEditOpen, setIsDamageEditOpen] = useState(false);
  const [damageEditDraft, setDamageEditDraft] = useState<DamageReportEditDraft | null>(null);
  const [damageEditStatus, setDamageEditStatus] = useState<string | null>(null);
  const [isDownloadingPhotos, setIsDownloadingPhotos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isMounted = useRef(true);
  const damageSortFieldRef = useRef(damageSortField);
  useEffect(() => {
    damageSortFieldRef.current = damageSortField;
  }, [damageSortField]);
  const damageReports = reportsSnapshot?.damageReports ?? [];
  const rsaReports = reportsSnapshot?.rsaReports ?? [];

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
    setError(reportsSnapshot?.partialError ?? null);
  }, [organizationId, reportsSnapshot?.partialError, sessionStatus]);

  const damageSummaries = useMemo<ReportSummary[]>(() => {
    return damageReports.map((report) => {
      const locationName = resolveDamageReportLocationName(report);
      const severity = resolveTopDamageSeverity(report, report.damage_entries);
      const normalizedStatus = (report.status as ReportStatus) || "open";
      return {
        id: report.report_id,
        type: "damage",
        status: normalizedStatus,
        title: `${report.make || ""} ${report.model || ""}`.trim() || report.report_id,
        vin: report.vin || "",
        make: report.make,
        model: report.model,
        year: report.year,
        inspectorEmail: report.inspector_email,
        locationName,
        facilityName: locationName,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        severity: severity ?? "n/a",
      };
    });
  }, [damageReports]);

  const normalizedDamageFilters = useMemo(
    () =>
      normalizeDamageReportFilters({
        facilityFilter,
        searchTerm,
        reportIdFilter,
        vinFilter,
        makeFilter,
        modelFilter,
        inspectorEmailFilter,
        statusFilter,
        createdFrom,
        createdTo,
      }),
    [
      createdFrom,
      createdTo,
      facilityFilter,
      inspectorEmailFilter,
      makeFilter,
      modelFilter,
      reportIdFilter,
      searchTerm,
      statusFilter,
      vinFilter,
    ]
  );
  const damageFilterKey = useMemo(() => serializeDamageReportFilters(normalizedDamageFilters), [normalizedDamageFilters]);

  const filteredDamageReports = useMemo(() => {
    return damageReports.filter((report) => matchesDamageReportFilters(report, normalizedDamageFilters));
  }, [damageFilterKey, damageReports, normalizedDamageFilters]);

  const filteredDamageSummaries = useMemo(() => {
    return filteredDamageReports.map((report) => {
      const locationName = resolveDamageReportLocationName(report);
      const severity = resolveTopDamageSeverity(report, report.damage_entries);
      const normalizedStatus = (report.status as ReportStatus) || "open";
      return {
        id: report.report_id,
        type: "damage",
        status: normalizedStatus,
        title: `${report.make || ""} ${report.model || ""}`.trim() || report.report_id,
        vin: report.vin || "",
        make: report.make,
        model: report.model,
        year: report.year,
        inspectorEmail: report.inspector_email,
        locationName,
        facilityName: locationName,
        createdAt: report.created_at,
        updatedAt: report.updated_at,
        severity: severity ?? "n/a",
      };
    });
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

  const selectedDamageFullRow = useMemo(() => damageReports.find(r => r.report_id === selectedDamageReportId) ?? null, [damageReports, selectedDamageReportId]);
  const selectedDamagePhotos = useMemo(() => getDamageReportPhotoUrls(selectedDamageFullRow), [selectedDamageFullRow]);
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
  const facilityChoices = useMemo<FacilitySummary[]>(() => {
    const choices = new Map<string, string>();
    damageSummaries.forEach((summary) => {
      const label = summary.locationName || summary.facilityName || "Unknown facility";
      const slug = slugForFacilityLabel(label);
      if (!choices.has(slug)) choices.set(slug, label);
    });
    return Array.from(choices.entries()).map(([slug, label]) => ({
      id: slug,
      name: label,
      slug,
      active: true,
      locationCount: 1,
    }));
  }, [damageSummaries]);
  const inspectorChoices = useMemo(() => {
    const usersByEmail = new Map<string, { email: string; label: string }>();
    (directory?.users ?? []).forEach((user) => {
      if (!user.email) return;
      usersByEmail.set(user.email.toLowerCase(), {
        email: user.email,
        label: user.name ? `${user.name} (${user.email})` : user.email,
      });
    });
    damageSummaries.forEach((summary) => {
      const email = summary.inspectorEmail?.trim();
      if (!email || usersByEmail.has(email.toLowerCase())) return;
      usersByEmail.set(email.toLowerCase(), { email, label: email });
    });
    return Array.from(usersByEmail.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [damageSummaries, directory?.users]);
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
  const clearDamageFilters = useCallback(() => {
    setActiveDamageFilterKeys([]);
    setFacilityFilter("all");
    setSearchTerm("");
    setReportIdFilter("");
    setVinFilter("");
    setMakeFilter("");
    setModelFilter("");
    setInspectorEmailFilter("");
    setStatusFilter("");
    setCreatedFrom("");
    setCreatedTo("");
  }, []);
  const availableDamageFilterOptions = useMemo(
    () => DAMAGE_FILTER_OPTIONS.filter((option) => !activeDamageFilterKeys.includes(option.key)),
    [activeDamageFilterKeys]
  );
  const removeDamageFilter = useCallback((key: DamageReportFilterKey) => {
    setActiveDamageFilterKeys((current) => current.filter((filterKey) => filterKey !== key));
    if (key === "facility") setFacilityFilter("all");
    if (key === "report_id") setReportIdFilter("");
    if (key === "vin") setVinFilter("");
    if (key === "make") setMakeFilter("");
    if (key === "model") setModelFilter("");
    if (key === "inspector_email") setInspectorEmailFilter("");
    if (key === "status") setStatusFilter("");
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBrokenDamagePhotoUrls({});
  }, [selectedDamageReportId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        pdf_url: selectedDamageFullRow.pdf_url ?? selectedDamageFullRow.overview?.pdf_url ?? "",
        status: selectedDamageFullRow.status ?? "open",
      };
      await ReportsAdapter.updateDamageReport(selectedDamageFullRow.report_id, payload);
      setDamageEditStatus("Report saved successfully.");
      await refreshReportsSnapshot();
      setIsDamageEditOpen(false);
      setDamageEditDraft(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save damage report.";
      setDamageEditStatus(message);
    }
  }, [damageEditDraft, refreshReportsSnapshot, selectedDamageFullRow]);

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
      return (
        <div className="w-52">
          <FacilitySelector facilities={facilityChoices} value={facilityFilter} onChange={setFacilityFilter} />
        </div>
      );
    }
    if (key === "report_id") {
      return (
        <input type="search" placeholder="Report ID" value={reportIdFilter} onChange={(event) => setReportIdFilter(event.target.value)} className={damageFilterInputClass} />
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
    if (key === "make") {
      return (
        <input type="search" placeholder="Make" value={makeFilter} onChange={(event) => setMakeFilter(event.target.value)} className={damageFilterInputClass} />
      );
    }
    if (key === "model") {
      return (
        <input type="search" placeholder="Model" value={modelFilter} onChange={(event) => setModelFilter(event.target.value)} className={damageFilterInputClass} />
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
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ReportStatus | "")} className={damageFilterInputClass}>
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="review">Review</option>
          <option value="closed">Closed</option>
          <option value="verified">Verified</option>
          <option value="archived">Archived</option>
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

  return (
    <div className="space-y-6">
      <PageTitle
        title={mode === "damage" ? "Damage Reports" : "Operations Reports"}
        subtitle={mode === "damage" ? "Vehicle inspection results" : "Analyze vehicle inspection activity across all facilities."}
      />

      <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.35)]">
        <div className="border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/40 px-6 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Damage Reports</p>
              <h2 className="text-xl font-black tracking-tight text-slate-950">Vehicle inspection results</h2>
              <p className="text-sm text-slate-600">Browse reports, inspect details, and export the visible set.</p>
            </div>
            <Badge variant="secondary" className="w-fit border-blue-200 bg-blue-50 text-blue-800">
              {sortedDamageSummaries.length} visible reports
            </Badge>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(420px,0.85fr)] lg:items-start">
            <div className="sticky top-24 h-[calc(100vh-7rem)] min-h-0 self-start">
              <Card className="flex h-full min-h-0 flex-col overflow-hidden border-slate-200/80 bg-white shadow-[0_18px_60px_-34px_rgba(15,23,42,0.25)]">
                <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 px-5 py-4 backdrop-blur">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Inspection Reports</p>
                      <p className="text-sm font-semibold text-slate-700">Scroll independently from the page</p>
                    </div>
                    <Badge variant="secondary" className="border-slate-200 bg-white text-slate-700">
                      {sortedDamageSummaries.length}
                    </Badge>
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
                        <Button type="button" variant="outline" size="sm" className="gap-2">
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
                    >
                      <FilterX className="mr-2 h-4 w-4" />
                      Clear
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                    onClick={() => void refreshReportsSnapshot()}
                      disabled={loading}
                      title={loading ? "Refresh in progress" : "Refresh reports"}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      onClick={() => {
                        const rows = buildFilteredReportCsvRows(filteredDamageReports, "facility");
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
                        {activeDamageFilterKeys.map((key) => {
                          const label = DAMAGE_FILTER_OPTIONS.find((option) => option.key === key)?.label ?? key;
                          return (
                            <div key={key} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                              <span className="w-24 shrink-0 truncate text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</span>
                              {renderDamageFilterControl(key)}
                              <button
                                type="button"
                                onClick={() => removeDamageFilter(key)}
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
                </div>
                <CardContent className="min-h-0 flex-1 p-0">
                  <ScrollArea className="h-full">
                    <Table>
                      <TableHeader className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur">
                        <TableRow className="bg-slate-50/95">
                          {[
                            "VIN",
                            "Facility",
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
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10">
                              <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                                <RefreshCw className="h-4 w-4 animate-spin" />
                                Loading reports...
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : error ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10">
                              <div className="space-y-2 text-center">
                                <div className="text-sm font-semibold text-rose-600">Damage reports could not be loaded.</div>
                                <div className="break-all whitespace-normal text-xs text-rose-500">{error}</div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : sortedDamageSummaries.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="py-10">
                              <EmptyState title="No Reports Found" description="No matching reports for your criteria." />
                            </TableCell>
                          </TableRow>
                        ) : (
                          sortedDamageSummaries.map((entry) => {
                            const isSelected = entry.id === selectedDamageReportId;
                            const rowTone = isSelected ? "bg-blue-50/80" : "bg-white";
                            return (
                              <TableRow
                                key={entry.id}
                                data-state={isSelected ? "selected" : undefined}
                                className={`cursor-pointer transition-colors hover:bg-slate-50 ${rowTone}`}
                                onClick={() => setSelectedDamageReportId(entry.id)}
                              >
                                <TableCell className={`font-mono text-sm ${isSelected ? "border-l-4 border-l-blue-600 bg-blue-50/80 font-semibold text-slate-950" : "text-slate-600"}`}>
                                  {entry.vin || "VIN unavailable"}
                                </TableCell>
                                <TableCell className={`text-sm break-all ${isSelected ? "bg-blue-50/80 font-medium text-slate-950" : "text-slate-600"}`}>
                                  {entry.locationName}
                                </TableCell>
                                <TableCell className={isSelected ? "bg-blue-50/80" : ""}>
                                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${severityPillClass(entry.severity)}`}>
                                    {entry.severity && entry.severity !== "n/a" ? resolveSeverityLabel(entry.severity) : "N/A"}
                                  </span>
                                </TableCell>
                                <TableCell className={isSelected ? "bg-blue-50/80" : ""}>
                                  <StatusBadge label={entry.status} tone={toneForReportStatus(entry.status)} />
                                </TableCell>
                                <TableCell className={`text-sm ${isSelected ? "bg-blue-50/80 font-medium text-slate-950" : "text-slate-600"}`}>
                                  {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "N/A"}
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
            <div className="sticky top-24 h-[calc(100vh-7rem)] min-h-0 self-start">
              {selectedDamageFullRow ? (
                <div className="flex h-full min-h-0 flex-col gap-4">
              <Card className="overflow-hidden border-slate-200/80 bg-white shadow-[0_24px_70px_-34px_rgba(15,23,42,0.24)]">
                <div className="h-1.5 bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-400" />
                <div className="bg-gradient-to-br from-blue-50/90 via-white to-slate-50 px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-3">
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
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge label={selectedDamageFullRow.status || "open"} tone={toneForReportStatus(selectedDamageFullRow.status || "open")} />
                        <Badge variant="secondary" className="rounded-full border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800">
                          {formatDamageReportTimestamp(selectedDamageFullRow.created_at || selectedDamageFullRow.updated_at)}
                        </Badge>
                        <Badge variant="secondary" className="rounded-full border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
                          {resolveDamageReportLocationName(selectedDamageFullRow)}
                        </Badge>
                      </div>
                    </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
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
                            variant="secondary"
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
                          {selectedDamageEntries.length > 0 ? (
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
              className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                className="absolute right-4 top-4 z-10 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white transition hover:bg-black/80"
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
