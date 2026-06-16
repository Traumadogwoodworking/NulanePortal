"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  MapPin,
  RefreshCw,
  X,
} from "lucide-react";
import { saveAs } from "file-saver";
import { apiFetch } from "@/lib/apiClient";
import { usePortalSession } from "@/lib/portalSession";
import { usePortalReportsSnapshot } from "@/lib/portalData";
import { FacilitySelector } from "@/components/ui/FacilitySelector";
import { DataTableShell } from "@/components/ui/DataTableShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/Badge";
import {
  DEFAULT_RSA_REPORT_FILTERS,
  FACILITY_FILTER_ALL,
  matchesRsaRailcarSearch,
  matchesRsaSummaryFilters,
  normalizeRsaReportFilters,
} from "@/lib/reportFilters";
import { resolveRsaFacilityLabel, slugForFacilityLabel } from "@/lib/reportUtils";
import type { FacilitySummary, ReportSummary } from "@/lib/types";

type RsaDeckEntry =
  | { vin?: unknown; value?: unknown }
  | string
  | number
  | null
  | undefined;

type RsaCarRecord = {
  railCarNumber?: string | null;
  rail_car_number?: string | null;
  car_id?: string | null;
  spot?: string | null;
  decks?: Record<string, RsaDeckEntry[]>;
};

type RsaRailcarRow = {
  reportId: string;
  reportSubject: string;
  railcarId: string;
  vins: string[];
  deckVinsMap: Record<string, string[]>;
  decks: string[];
  track: string;
  spot: string;
  createdAt?: string;
  inspectorEmail?: string;
  facilityName?: string;
  originalReport: ReportSummary;
};

type RsaFilterChipDef = {
  key: keyof RsaReportFilters;
  label: string;
  inputType?: "text" | "date";
  placeholder?: string;
};

type RsaReportFilters = {
  facilityFilter: string;
  searchTerm: string;
  rsaTrackFilter: string;
  rsaSpotFilter: string;
  rsaStartDate: string;
  rsaEndDate: string;
};

const RSA_FILTER_OPTIONS: RsaFilterChipDef[] = [
  { key: "searchTerm", label: "Railcar / VIN", placeholder: "Search railcar or VIN" },
  { key: "rsaTrackFilter", label: "Track", placeholder: "Enter track" },
  { key: "rsaSpotFilter", label: "Spot", placeholder: "Enter spot" },
  { key: "rsaStartDate", label: "Start Date", inputType: "date", placeholder: "YYYY-MM-DD" },
  { key: "rsaEndDate", label: "End Date", inputType: "date", placeholder: "YYYY-MM-DD" },
];

const RSA_COLUMNS = ["Asset Identifiers", "Track", "Spot", "Facility", "Created"];

function formatRsaDate(value?: string | null): string {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleDateString();
}

function formatRsaTime(value?: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function normalizeVinEntry(entry: RsaDeckEntry): string | null {
  if (typeof entry === "string" || typeof entry === "number") {
    const vin = entry.toString().trim().toUpperCase();
    return vin ? vin : null;
  }
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const rawVin = entry.vin ?? entry.value;
  if (typeof rawVin === "string" || typeof rawVin === "number") {
    const vin = rawVin.toString().trim().toUpperCase();
    return vin ? vin : null;
  }
  return null;
}

function csvEscape(value: unknown): string {
  const text = (value ?? "").toString();
  return `"${text.replace(/"/g, '""')}"`;
}

function useRsaReports() {
  const { data: reportsSnapshot, mutate: refreshReportsSnapshot } = usePortalReportsSnapshot();
  const loadRsaReports = useCallback(() => {
    void refreshReportsSnapshot();
  }, [refreshReportsSnapshot]);
  const rsaReports = reportsSnapshot?.rsaReports ?? [];
  const partialLoadError = reportsSnapshot?.partialError ?? null;
  return { rsaReports, partialLoadError, loadRsaReports };
}

export function RsaReportsManager() {
  const { session } = usePortalSession();
  const { rsaReports, partialLoadError, loadRsaReports } = useRsaReports();
  const [facilityFilter, setFacilityFilter] = useState(DEFAULT_RSA_REPORT_FILTERS.facilityFilter);
  const [searchTerm, setSearchTerm] = useState(DEFAULT_RSA_REPORT_FILTERS.searchTerm);
  const [rsaTrackFilter, setRsaTrackFilter] = useState(DEFAULT_RSA_REPORT_FILTERS.rsaTrackFilter);
  const [rsaSpotFilter, setRsaSpotFilter] = useState(DEFAULT_RSA_REPORT_FILTERS.rsaSpotFilter);
  const [rsaStartDate, setRsaStartDate] = useState(DEFAULT_RSA_REPORT_FILTERS.rsaStartDate);
  const [rsaEndDate, setRsaEndDate] = useState(DEFAULT_RSA_REPORT_FILTERS.rsaEndDate);
  const [activeFilterKeys, setActiveFilterKeys] = useState<Array<keyof RsaReportFilters>>(["searchTerm"]);
  const [selectedRsaReportId, setSelectedRsaReportId] = useState<string | null>(null);
  const [selectedRsaRailcarRow, setSelectedRsaRailcarRow] = useState<RsaRailcarRow | null>(null);
  const [sendingEod, setSendingEod] = useState(false);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const loading = false;

  const filters: RsaReportFilters = useMemo(
    () =>
      normalizeRsaReportFilters({
        facilityFilter,
        searchTerm,
        rsaTrackFilter,
        rsaSpotFilter,
        rsaStartDate,
        rsaEndDate,
      }),
    [facilityFilter, rsaEndDate, rsaSpotFilter, rsaStartDate, rsaTrackFilter, searchTerm]
  );

  const setFilterValue = useCallback((key: keyof RsaReportFilters, value: string) => {
    switch (key) {
      case "facilityFilter":
        setFacilityFilter(value);
        break;
      case "searchTerm":
        setSearchTerm(value);
        break;
      case "rsaTrackFilter":
        setRsaTrackFilter(value);
        break;
      case "rsaSpotFilter":
        setRsaSpotFilter(value);
        break;
      case "rsaStartDate":
        setRsaStartDate(value);
        break;
      case "rsaEndDate":
        setRsaEndDate(value);
        break;
    }
  }, []);

  const clearFilters = useCallback(() => {
    setFacilityFilter(FACILITY_FILTER_ALL);
    setSearchTerm("");
    setRsaTrackFilter("");
    setRsaSpotFilter("");
    setRsaStartDate("");
    setRsaEndDate("");
    setActiveFilterKeys(["searchTerm"]);
  }, []);

  const removeFilterChip = useCallback((key: keyof RsaReportFilters) => {
    setFilterValue(key, "");
    setActiveFilterKeys((current) => current.filter((k) => k !== key));
  }, [setFilterValue]);

  const addFilterChip = useCallback((key: keyof RsaReportFilters) => {
    setActiveFilterKeys((current) => (current.includes(key) ? current : [...current, key]));
  }, []);

  const hideFacilitySelector = (session?.organization?.name ?? "").trim().toLowerCase() === "free tier organization";

  const rsaSummaries = useMemo<ReportSummary[]>(() => {
    return rsaReports.map((report) => ({
      id: report.report_id,
      type: "rsa",
      status: "closed",
      title: report.subject || report.report_id,
      inspectorEmail: report.inspector_email,
      facilityName: resolveRsaFacilityLabel(report),
      locationName: report.rail_car_number || report.facility || "",
      createdAt: report.created_at,
      updatedAt: report.updated_at,
      track: report.track || null,
      spot: report.spot || null,
      cars: report.cars ?? [],
      payload: report.payload,
    }));
  }, [rsaReports]);

  const resolveCarDisplayInfo = useCallback((car: RsaCarRecord) => {
    const allVins: string[] = [];
    const deckVinsMap: Record<string, string[]> = {};

    if (car.decks) {
      Object.entries(car.decks).forEach(([deckKey, deckVins]) => {
        const vinsForDeck: string[] = [];
        deckVins.forEach((v) => {
          const vinVal = normalizeVinEntry(v);
          if (vinVal && vinVal !== "N/A" && vinVal !== "UNDEFINED") {
            allVins.push(vinVal);
            vinsForDeck.push(vinVal);
          }
        });
        if (vinsForDeck.length > 0) {
          deckVinsMap[deckKey] = vinsForDeck;
        }
      });
    }

    const railcarNum = (car.railCarNumber || car.rail_car_number || car.car_id || "").toUpperCase();

    return {
      vinCount: allVins.length,
      allVins,
      deckVinsMap,
      railcarId: railcarNum,
      decks: Object.keys(deckVinsMap).sort(),
    };
  }, []);

  const flatRsaRailcars = useMemo(() => {
    const flat: RsaRailcarRow[] = [];
    rsaSummaries.forEach((summary) => {
      if (!matchesRsaSummaryFilters(summary, filters)) return;

      summary.cars?.forEach((car) => {
        const rsaCar = car as RsaCarRecord;
        const { allVins, deckVinsMap, railcarId, decks } = resolveCarDisplayInfo(rsaCar);

        if (!matchesRsaRailcarSearch(summary, rsaCar.spot, railcarId, allVins, filters.searchTerm)) return;

        flat.push({
          reportId: summary.id,
          reportSubject: summary.title || summary.id,
          railcarId,
          vins: allVins,
          deckVinsMap,
          decks,
          track: summary.track || "—",
          spot: rsaCar.spot || summary.spot || "—",
          createdAt: summary.createdAt,
          inspectorEmail: summary.inspectorEmail,
          facilityName: summary.facilityName,
          originalReport: summary,
        });
      });
    });

    return flat.sort((a, b) =>
      b.createdAt && a.createdAt ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : 0
    );
  }, [filters, resolveCarDisplayInfo, rsaSummaries]);

  const groupedRsaRows = useMemo(() => {
    const days: Record<string, Record<string, Record<string, RsaRailcarRow[]>>> = {};

    flatRsaRailcars.forEach((car) => {
      const dateKey = car.createdAt
        ? new Date(car.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
        : "Ongoing";
      if (!days[dateKey]) days[dateKey] = {};
      const trackKey = car.track && car.track !== "—" ? `Track ${car.track}` : "Miscellaneous";
      if (!days[dateKey][trackKey]) days[dateKey][trackKey] = {};
      const spotKey = car.spot && car.spot !== "—" ? `Spot ${car.spot}` : "Unassigned";
      if (!days[dateKey][trackKey][spotKey]) days[dateKey][trackKey][spotKey] = [];

      days[dateKey][trackKey][spotKey].push(car);
    });
    return days;
  }, [flatRsaRailcars]);

  const groupedRsaDayStats = useMemo(() => {
    const stats: Record<string, { cars: number; vins: number }> = {};
    Object.entries(groupedRsaRows).forEach(([date, tracks]) => {
      let cars = 0;
      let vins = 0;
      Object.values(tracks).forEach((spots) => {
        Object.values(spots).forEach((railcars) => {
          cars += railcars.length;
          vins += railcars.reduce((sum, rc) => sum + rc.vins.length, 0);
        });
      });
      stats[date] = { cars, vins };
    });
    return stats;
  }, [groupedRsaRows]);

  const facilityChoices = useMemo<FacilitySummary[]>(() => {
    const map = new Map<string, string>();
    rsaSummaries.forEach((summary) => {
      const label = summary.facilityName || summary.locationName || "Unknown facility";
      const slug = slugForFacilityLabel(label);
      if (!map.has(slug)) map.set(slug, label);
    });
    return Array.from(map.entries()).map(([slug, name]) => ({
      id: slug,
      name,
      slug,
      region: "",
      active: true,
      locationCount: 1,
    }));
  }, [rsaSummaries]);

  const selectedRsaFullRow = useMemo(
    () => rsaReports.find((r) => r.report_id === selectedRsaReportId) ?? null,
    [rsaReports, selectedRsaReportId]
  );
  const selectedRsaRailcar = useMemo(
    () => selectedRsaRailcarRow ?? flatRsaRailcars.find((row) => row.reportId === selectedRsaReportId) ?? null,
    [flatRsaRailcars, selectedRsaRailcarRow, selectedRsaReportId]
  );

  const buildDayDeckRows = useCallback((daySummaries: RsaRailcarRow[] = []) => {
    return daySummaries.flatMap((summary) => {
      const rows: Array<{
        spot: string;
        carId: string;
        deck: string;
        submittedAt: string | null;
        count: number;
        vins: string[];
        track: string;
      }> = [];

      if (!summary.vins.length) {
        rows.push({
          spot: summary.spot || "",
          carId: summary.railcarId || "",
          deck: "",
          submittedAt: summary.createdAt || null,
          count: 0,
          vins: [],
          track: summary.track || "Uncategorized",
        });
        return rows;
      }

      Object.entries(summary.deckVinsMap).forEach(([deck, vins]) => {
        rows.push({
          spot: summary.spot || "",
          carId: summary.railcarId || "",
          deck,
          submittedAt: summary.createdAt || null,
          count: vins.length,
          vins,
          track: summary.track || "Uncategorized",
        });
      });

      return rows;
    });
  }, []);

  const exportDayToCsv = useCallback(
    (dayKey: string) => {
      const daySummaries = Object.values(groupedRsaRows[dayKey] || {}).flatMap((spots) =>
        Object.values(spots).flat()
      );
      if (!daySummaries.length) return;

      const rows = buildDayDeckRows(daySummaries);
      const header = ["Spot#", "Railcar", "Deck", "Submitted At", "Time", "VIN"];
      const lines = [header.map(csvEscape).join(",")];

      const trackMap = new Map<string, typeof rows>();
      rows.forEach((row) => {
        const track = row.track || "Uncategorized";
        if (!trackMap.has(track)) {
          trackMap.set(track, []);
        }
        trackMap.get(track)!.push(row);
      });

      const sortedTracks = Array.from(trackMap.keys()).sort((a, b) => {
        if (a === "Uncategorized") return 1;
        if (b === "Uncategorized") return -1;
        return a.localeCompare(b);
      });

      sortedTracks.forEach((track) => {
        const trackRows = trackMap.get(track) || [];
        if (track !== "Uncategorized") {
          lines.push(`Track ${track}`);
        }
        trackRows.forEach((row) => {
          const formattedDate = formatRsaDate(row.submittedAt);
          const formattedTime = formatRsaTime(row.submittedAt);
          if (!row.vins.length) {
            lines.push([row.spot || "", row.carId, row.deck, formattedDate, formattedTime, ""].map(csvEscape).join(","));
            return;
          }
          row.vins.forEach((vin) => {
            lines.push([row.spot || "", row.carId, row.deck, formattedDate, formattedTime, vin].map(csvEscape).join(","));
          });
        });
      });

      saveAs(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }), `rsa-day-${dayKey || "report"}.csv`);
    },
    [buildDayDeckRows, groupedRsaRows]
  );

  const handleSendEodRsa = useCallback(async () => {
    setSendingEod(true);
    setOperationMessage(null);
    try {
      await apiFetch("/railcar-scans/reports/eod", {
        method: "POST",
        body: JSON.stringify({
          requestedAt: new Date().toISOString(),
          requestedDateLocal: new Date().toISOString().slice(0, 10),
          timezoneOffsetMinutes: new Date().getTimezoneOffset(),
        }),
      });
      setOperationMessage("SUCCESS: EOD Report compiled and dispatched to notification list.");
      loadRsaReports();
    } catch (error) {
      setOperationMessage(error instanceof Error ? error.message : "ERROR: Unable to dispatch EOD report.");
    } finally {
      setSendingEod(false);
    }
  }, [loadRsaReports]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.searchTerm ||
      filters.rsaTrackFilter ||
      filters.rsaSpotFilter ||
      filters.rsaStartDate ||
      filters.rsaEndDate ||
      filters.facilityFilter !== FACILITY_FILTER_ALL
    );
  }, [filters]);

  const renderFilterChip = (def: RsaFilterChipDef) => {
    const value = filters[def.key];
    return (
      <div
        key={def.key}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm"
      >
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{def.label}</span>
        <Input
          type={def.inputType || "text"}
          placeholder={def.placeholder}
          value={value}
          onChange={(e) => setFilterValue(def.key, e.target.value)}
          className="h-6 w-32 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0 sm:w-40"
        />
        <button
          type="button"
          aria-label={`Remove ${def.label} filter`}
          onClick={() => removeFilterChip(def.key)}
          className="rounded p-0.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  };

  const unusedFilterOptions = RSA_FILTER_OPTIONS.filter((option) => !activeFilterKeys.includes(option.key));

  return (
    <article className="space-y-5 pb-12">
      <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-slate-900">RSA Logistics Summary</h2>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-500">Asset Registry Stream</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={() => void handleSendEodRsa()}
            disabled={sendingEod}
            className="bg-slate-900 text-white hover:bg-slate-800"
          >
            {sendingEod ? "Dispatching…" : "Send Current Day RSA Report"}
          </Button>
          <Button type="button" variant="outline" size="icon" onClick={loadRsaReports} aria-label="Refresh reports">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </header>

      {partialLoadError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] font-black uppercase tracking-widest text-amber-800">
          <span>RSA reports are partially unavailable: {partialLoadError}</span>
          <button
            type="button"
            onClick={loadRsaReports}
            className="rounded-full border border-current/20 bg-white/50 px-3 py-1.5 transition hover:bg-white"
          >
            Retry
          </button>
        </div>
      )}

      {operationMessage ? (
        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
          {operationMessage}
        </div>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filter by</span>
          <div className="relative">
            <select
              value=""
              onChange={(e) => {
                const key = e.target.value as keyof RsaReportFilters;
                if (key) addFilterChip(key);
                e.target.value = "";
              }}
              className="h-8 appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-xs font-medium text-slate-700 outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
            >
              <option value="">Choose a filter…</option>
              {unusedFilterOptions.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          </div>

          {!hideFacilitySelector ? (
            <div className="ml-1">
              <FacilitySelector facilities={facilityChoices} value={facilityFilter} onChange={setFacilityFilter} />
            </div>
          ) : null}

          {hasActiveFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto text-[10px] font-black uppercase tracking-widest text-slate-400 transition hover:text-slate-900"
            >
              Clear filters
            </button>
          ) : null}
        </div>

        {activeFilterKeys.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {activeFilterKeys.map((key) => {
              const def = RSA_FILTER_OPTIONS.find((option) => option.key === key);
              return def ? renderFilterChip(def) : null;
            })}
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(380px,0.85fr)] xl:items-start">
        <DataTableShell
          columns={RSA_COLUMNS}
          title="Inbound Railcars"
          description="Grouped by date, track, and spot"
          actions={
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
              {flatRsaRailcars.length} railcar{flatRsaRailcars.length === 1 ? "" : "s"}
            </span>
          }
        >
          {loading ? (
            <tr>
              <td colSpan={RSA_COLUMNS.length} className="py-12 text-center text-slate-400">
                <RefreshCw className="mx-auto mb-2 h-5 w-5 animate-spin opacity-40" />
                <p className="text-[10px] font-black uppercase tracking-widest">Processing Logistics…</p>
              </td>
            </tr>
          ) : flatRsaRailcars.length === 0 ? (
            <tr>
              <td colSpan={RSA_COLUMNS.length} className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                No telemetry found in timeline.
              </td>
            </tr>
          ) : (
            Object.entries(groupedRsaRows).map(([date, tracks]) => {
              const dayStats = groupedRsaDayStats[date] || { cars: 0, vins: 0 };
              return (
                <React.Fragment key={date}>
                  <tr className="bg-slate-50/80 border-b border-slate-200/50">
                    <td colSpan={RSA_COLUMNS.length} className="px-3 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-700" />
                          <h3 className="text-[12px] font-black uppercase tracking-tight text-slate-800">{date}</h3>
                          <Badge variant="outline">
                            {dayStats.cars} RC • {dayStats.vins} VINs
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => exportDayToCsv(date)}
                        >
                          <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                          Export
                        </Button>
                      </div>
                    </td>
                  </tr>
                  {Object.entries(tracks).map(([trackName, spots], trackIdx) => {
                    let rcCount = 0;
                    let vinCountSum = 0;
                    Object.values(spots).forEach((railcars) => {
                      rcCount += railcars.length;
                      vinCountSum += railcars.reduce((sum, rc) => sum + rc.vins.length, 0);
                    });
                    const trackLabel = trackName.startsWith("Track ") ? trackName.slice(6) : trackName;

                    return (
                      <React.Fragment key={`track-${trackIdx}`}>
                        <tr className="border-b border-slate-100">
                          <td colSpan={RSA_COLUMNS.length} className="px-5 py-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-[12px] font-bold uppercase tracking-widest text-slate-900">
                                  Track {trackLabel}
                                </span>
                                <Badge variant="secondary">
                                  {rcCount} RC • {vinCountSum} VINs
                                </Badge>
                              </div>
                            </div>
                          </td>
                        </tr>
                        {Object.entries(spots).map(([spotName, railcars]) => {
                          const spotVinCount = railcars.reduce((acc, car) => acc + car.vins.length, 0);
                          return (
                            <React.Fragment key={spotName}>
                              <tr className="cursor-pointer border-b border-slate-100">
                                <td colSpan={RSA_COLUMNS.length} className="px-5 py-1.5">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[12px] font-bold uppercase tracking-widest text-slate-600">
                                        {spotName}
                                      </span>
                                      <span className="text-[10px] font-bold text-slate-500 px-1.5 py-0.5">
                                        {railcars.length} RC | {spotVinCount} VINs
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                              {railcars.map((car, idx) => {
                                const isSelected = car.reportId === selectedRsaReportId;
                                return (
                                  <tr
                                    key={`${car.reportId}-${car.railcarId}-${idx}`}
                                    data-row-key={`${car.reportId}-${car.railcarId}-${idx}`}
                                    className={`group cursor-pointer border-b border-slate-100 transition-all hover:bg-slate-50 ${
                                      isSelected ? "bg-blue-50/80 shadow-[inset_3px_0_0_0_rgba(37,99,235,0.45)]" : ""
                                    }`}
                                    onClick={() => {
                                      setSelectedRsaReportId(car.reportId);
                                      setSelectedRsaRailcarRow(car);
                                    }}
                                  >
                                    <td className="pl-10 pr-3 py-3">
                                      <div className="flex items-center gap-2">
                                        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-600">
                                          Railcar
                                        </span>
                                        <span className="font-mono text-[15px] font-black tracking-widest text-slate-900">
                                          {car.railcarId || "UNASSIGNED"}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-3 text-[12px] font-black uppercase tracking-tight text-slate-700">
                                      {car.track}
                                    </td>
                                    <td className="px-3 py-3 text-[12px] font-black uppercase tracking-tight text-slate-700">
                                      {car.spot}
                                    </td>
                                    <td className="px-3 py-3 text-[12px] font-black uppercase tracking-tight text-slate-700">
                                      {car.facilityName}
                                    </td>
                                    <td className="whitespace-nowrap px-3 py-3 text-[12px] font-black uppercase tracking-tight text-slate-700">
                                      {car.createdAt
                                        ? new Date(car.createdAt).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })
                                        : "—"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })}
                        <tr aria-hidden="true">
                          <td colSpan={RSA_COLUMNS.length} className="border-0 p-0">
                            <div className="h-3" />
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </React.Fragment>
              );
            })
          )}
        </DataTableShell>

        <aside className="sticky top-6 flex max-h-[calc(100vh-3rem)] min-h-[400px] flex-col self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {selectedRsaFullRow ? (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              <div className="h-1.5 shrink-0 bg-gradient-to-r from-slate-900 via-slate-600 to-slate-200" />
              <header className="border-b border-slate-100 bg-slate-50/80 p-5">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="rounded border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {selectedRsaFullRow.report_id.substring(0, 8)}
                  </span>
                </div>
                <div>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.25em] text-slate-700">
                    Selected row
                  </span>
                  <h3 className="mt-2 text-[18px] font-black leading-tight tracking-tight text-slate-900">
                    {selectedRsaFullRow.subject || "Railcar Inbound Entry"}
                  </h3>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Submitted{" "}
                    {selectedRsaFullRow.created_at ? new Date(selectedRsaFullRow.created_at).toLocaleString() : "time unavailable"}
                  </p>
                </div>
              </header>
              <div className="h-1.5 shrink-0 bg-gradient-to-r from-slate-900 via-slate-600 to-slate-200" />
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <MapPin className="h-3 w-3 text-slate-400" /> Track
                    </span>
                    <span className="font-mono text-[18px] tracking-widest text-slate-900">
                      {selectedRsaRailcar?.track || selectedRsaFullRow.track || "—"}
                    </span>
                  </div>
                  <div className="flex flex-col rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <span className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                      Designated Spot
                    </span>
                    <span className="font-mono text-[18px] tracking-widest text-slate-900">
                      {selectedRsaRailcar?.spot || selectedRsaFullRow.spot || "—"}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  {((selectedRsaFullRow.cars ?? []) as RsaCarRecord[]).map((car, carIdx) => {
                    const allVins: string[] = [];
                    const deckVinsMap: Record<string, string[]> = {};
                    if (car.decks) {
                      Object.entries(car.decks).forEach(([dKey, dVins]) => {
                        const deckSet = dVins
                          .map((entry) => normalizeVinEntry(entry))
                          .filter((vin): vin is string => Boolean(vin));
                        allVins.push(...deckSet);
                        deckVinsMap[dKey] = deckSet;
                      });
                    }
                    const railcarNum = (car.railCarNumber || car.rail_car_number || car.car_id || "UNASSIGNED").toUpperCase();

                    return (
                      <div key={carIdx} className="space-y-2 border-l-[3px] border-slate-200 py-1 pl-3">
                        <div className="flex items-center gap-3">
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                            {railcarNum}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                            {allVins.length} Total VINs
                          </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {Object.entries(deckVinsMap).map(([deckType, vins]) => (
                            <div key={deckType} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <div className="mb-2 flex items-center justify-between border-b border-slate-200 pb-2">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                                  Deck {deckType}
                                </p>
                              </div>
                              <div className="grid grid-cols-1 gap-1.5">
                                {vins.map((vin, vIdx) => (
                                  <div key={vIdx} className="flex items-center gap-2">
                                    <div className="flex h-5 w-5 items-center justify-center rounded-md border border-slate-200 bg-white text-[10px] font-black text-slate-500">
                                      {vIdx + 1}
                                    </div>
                                    <span className="font-mono text-[12px] font-bold tracking-wider text-slate-800">
                                      {vin}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inspector</span>
                    <span className="text-[12px] font-bold text-slate-700">{selectedRsaFullRow.inspector_email || "System"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Facility Focus</span>
                    <span className="text-[12px] font-bold uppercase text-slate-700">{selectedRsaFullRow.facility || "Hub"}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full min-h-[400px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-300 shadow-sm">
                <FileText className="h-6 w-6" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Load Manifest Detail</h4>
              <p className="mt-2 max-w-[220px] text-[12px] font-medium text-slate-400">
                Click any row in the registry table to view the selected row in the sidebar.
              </p>
            </div>
          )}
        </aside>
      </div>
    </article>
  );
}
