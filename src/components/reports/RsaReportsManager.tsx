"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DataTableShell } from "@/components/ui/DataTableShell";
import { FacilitySelector } from "@/components/ui/FacilitySelector";
import { ReportsAdapter } from "@/lib/services/reportService";
import { apiFetch } from "@/lib/apiClient";
import { saveAs } from "file-saver";
import { 
  ChevronRight, 
  FileSpreadsheet, 
  FileText, 
  Calendar,
  MapPin,
  RefreshCw, 
  Search, 
} from "lucide-react";
import { resolveRsaFacilityLabel, slugForFacilityLabel } from "@/lib/reportUtils";
import { Button } from "@/components/ui/button";
import { usePortalReportsSnapshot } from "@/lib/portalData";
import {
  DEFAULT_RSA_REPORT_FILTERS,
  FACILITY_FILTER_ALL,
  matchesRsaRailcarSearch,
  matchesRsaSummaryFilters,
  normalizeRsaReportFilters,
  serializeRsaReportFilters,
} from "@/lib/reportFilters";
import type { FacilitySummary, RsaReportApiRow, ReportSummary } from "@/lib/types";

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

function formatRsaDate(value?: string | null): string {
  if (!value) return "Unknown date";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown date";
  return parsed.toLocaleString();
}

function formatRsaTime(value?: string | null): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleTimeString();
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

export function RsaReportsManager() {
  const { data: reportsSnapshot, mutate: refreshReportsSnapshot } = usePortalReportsSnapshot();
  const [facilityFilter, setFacilityFilter] = useState(DEFAULT_RSA_REPORT_FILTERS.facilityFilter);
  const [searchTerm, setSearchTerm] = useState(DEFAULT_RSA_REPORT_FILTERS.searchTerm);
  const [rsaTrackFilter, setRsaTrackFilter] = useState(DEFAULT_RSA_REPORT_FILTERS.rsaTrackFilter);
  const [rsaSpotFilter, setRsaSpotFilter] = useState(DEFAULT_RSA_REPORT_FILTERS.rsaSpotFilter);
  const [rsaStartDate, setRsaStartDate] = useState(DEFAULT_RSA_REPORT_FILTERS.rsaStartDate);
  const [rsaEndDate, setRsaEndDate] = useState(DEFAULT_RSA_REPORT_FILTERS.rsaEndDate);
  const [selectedRsaReportId, setSelectedRsaReportId] = useState<string | null>(null);
  const [selectedRsaRailcarRow, setSelectedRsaRailcarRow] = useState<RsaRailcarRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partialLoadError, setPartialLoadError] = useState<string | null>(null);
  const [sendingEod, setSendingEod] = useState(false);
  const [operationMessage, setOperationMessage] = useState<string | null>(null);
  const loadRsaReports = useCallback(() => {
    void refreshReportsSnapshot();
  }, [refreshReportsSnapshot]);

  useEffect(() => {
    setLoading(false);
    setLoadError(null);
    setPartialLoadError(reportsSnapshot?.partialError ?? null);
  }, [reportsSnapshot?.partialError]);
  const rsaReports = reportsSnapshot?.rsaReports ?? [];
  const normalizedRsaFilters = useMemo(
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
  const rsaFilterKey = useMemo(() => serializeRsaReportFilters(normalizedRsaFilters), [normalizedRsaFilters]);

  const resolveCarDisplayInfo = (car: RsaCarRecord) => {
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
  };

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

  // Flattened Data: one entry per Railcar explicitly (separating RC and VIN displays)
  const flatRsaRailcars = useMemo(() => {
    const flat: RsaRailcarRow[] = [];
    rsaSummaries.forEach((summary) => {
      if (!matchesRsaSummaryFilters(summary, normalizedRsaFilters)) return;

      summary.cars?.forEach((car) => {
        const rsaCar = car as RsaCarRecord;
        const { allVins, deckVinsMap, railcarId, decks } = resolveCarDisplayInfo(rsaCar);
        
        if (!matchesRsaRailcarSearch(summary, rsaCar.spot, railcarId, allVins, normalizedRsaFilters.searchTerm)) return;

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
          originalReport: summary
        });
      });
    });
    
    return flat.sort((a,b) => (b.createdAt && a.createdAt) ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() : 0);
  }, [normalizedRsaFilters, rsaFilterKey, rsaSummaries]);

  const groupedRsaRows = useMemo(() => {
    const days: Record<string, Record<string, Record<string, RsaRailcarRow[]>>> = {};

    flatRsaRailcars.forEach(car => {
      const dateKey = car.createdAt ? new Date(car.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : 'Ongoing';
      if (!days[dateKey]) days[dateKey] = {};
      const trackKey = car.track && car.track !== "—" ? `Track ${car.track}` : 'Miscellaneous';
      if (!days[dateKey][trackKey]) days[dateKey][trackKey] = {};
      const spotKey = car.spot && car.spot !== "—" ? `Spot ${car.spot}` : 'Unassigned';
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
    return Array.from(map.entries()).map(([slug, label]) => ({
      id: slug,
      name: label,
      slug,
      region: "",
      active: true,
      locationCount: 1,
    }));
  }, [rsaSummaries]);

  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setFacilityFilter(FACILITY_FILTER_ALL);
    setRsaTrackFilter("");
    setRsaSpotFilter("");
    setRsaStartDate("");
    setRsaEndDate("");
  }, []);

  const csvEscape = useCallback((value: unknown) => {
    const text = (value ?? "").toString();
    return `"${text.replace(/"/g, '""')}"`;
  }, []);

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
      void refreshReportsSnapshot();
    } catch (error) {
      setOperationMessage(error instanceof Error ? error.message : "ERROR: Unable to dispatch EOD report.");
    } finally {
      setSendingEod(false);
    }
  }, [refreshReportsSnapshot]);

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

      const deckEntries = Object.entries(summary.deckVinsMap);
      deckEntries.forEach(([deck, vins]) => {
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

  const exportDayToCsv = useCallback((dayKey: string) => {
    const daySummaries = Object.values(groupedRsaRows[dayKey] || {}).flatMap((spots) =>
      Object.values(spots).flat(),
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

    saveAs(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }), `day-${dayKey || "report"}.csv`);
  }, [buildDayDeckRows, csvEscape, groupedRsaRows]);

  const selectedRsaFullRow = useMemo(() => rsaReports.find(r => r.report_id === selectedRsaReportId) ?? null, [rsaReports, selectedRsaReportId]);
  const selectedRsaRailcar = useMemo(
    () => selectedRsaRailcarRow ?? flatRsaRailcars.find((row) => row.reportId === selectedRsaReportId) ?? null,
    [flatRsaRailcars, selectedRsaRailcarRow, selectedRsaReportId],
  );

  const rsaTrackOptions = useMemo(() => Array.from(new Set(rsaSummaries.map(s => s.track).filter(Boolean))).sort(), [rsaSummaries]);
  const rsaSpotOptions = useMemo(() => Array.from(new Set(rsaSummaries.map(s => s.spot).filter(Boolean))).sort(), [rsaSummaries]);

  const rsaColumns = ["Asset Identifiers", "Track", "Spot", "Facility", "Created"];

  return (
    <article className="rsa-reports-page space-y-6 pb-12">
      <header className="page-header flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="page-title text-[20px] font-black tracking-tight text-blue-800">
            RSA Reports
          </h1>
          <p className="page-subtitle text-[12px] text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Monitor railcar assets and internal VIN loading entries from direct physical scans. Vehicle-level identification ensures dense operational tracking.
          </p>
        </div>
      </header>

      {loadError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] p-3 text-[10px] font-black uppercase tracking-widest text-[color:var(--metric-warning-fg)]">
          <span>RSA reports could not be refreshed: {loadError}</span>
          <button
            type="button"
            onClick={loadRsaReports}
            className="rounded-full border border-current/20 bg-white/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition hover:bg-white/50"
          >
            Retry
          </button>
        </div>
      )}
      {partialLoadError && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] p-3 text-[10px] font-black uppercase tracking-widest text-[color:var(--metric-warning-fg)]">
          <span>RSA reports are partially unavailable: {partialLoadError}</span>
          <button
            type="button"
            onClick={loadRsaReports}
            className="rounded-full border border-current/20 bg-white/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition hover:bg-white/50"
          >
            Retry
          </button>
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
         <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
             <FileText className="w-4 h-4" />
           </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">RSA Logistics Summary</h2>
              <p className="text-[12px] text-slate-500 font-medium uppercase tracking-widest">Asset Registry Stream</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={() => void handleSendEodRsa()}
              disabled={sendingEod}
              className="rsa-action-button rsa-action-button--primary"
            >
              {sendingEod ? "Dispatching..." : "Send Current Day RSA Report"}
            </Button>
            <button type="button" onClick={loadRsaReports} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-500 transition-all">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {operationMessage ? (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-700">
            {operationMessage}
          </div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-6 gap-2 p-1.5 bg-slate-50/50 rounded-lg border border-slate-200/60 shadow-inner">
          <div className="xl:col-span-2 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-700 transition-colors" />
            <input
              type="text"
            className="rounded-md border border-slate-200 bg-white pl-9 pr-3 py-1.5 text-[12px] outline-none focus:ring-1 focus:ring-slate-300 shadow-sm w-full h-full"
              placeholder="Railcar number"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <input
            type="date"
            value={rsaStartDate}
            onChange={(e) => setRsaStartDate(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12px]"
            title="Submission date"
          />
          <select value={rsaTrackFilter || ""} onChange={(e) => setRsaTrackFilter(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12px]">
            <option value="">All Tracks</option>
            {rsaTrackOptions.slice().sort((a, b) => String(a || "").localeCompare(String(b || ""))).map((t) => <option key={t || "unknown"} value={t || ""}>{t}</option>)}
          </select>
          <select value={rsaSpotFilter || ""} onChange={(e) => setRsaSpotFilter(e.target.value)} className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-[12px]">
            <option value="">All Spots</option>
            {rsaSpotOptions.slice().sort((a, b) => String(a || "").localeCompare(String(b || ""))).map((s) => <option key={s || "unknown"} value={s || ""}>{s}</option>)}
          </select>
          <FacilitySelector facilities={facilityChoices} value={facilityFilter} onChange={setFacilityFilter} />
            <button onClick={clearFilters} className="py-1 bg-white border border-slate-200 rounded-md text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900">
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(420px,0.85fr)] xl:items-start">
          <div className="sticky top-24 flex h-[calc(100vh-7rem)] min-h-0 self-start">
            <div className="h-full min-h-0 w-full overflow-y-auto">
              <DataTableShell columns={rsaColumns}>
              {loading ? (
                <tr><td colSpan={rsaColumns.length} className="py-12 text-center text-slate-400"><RefreshCw className="w-5 h-5 animate-spin mx-auto opacity-40 mb-2" /><p className="text-[10px] font-black uppercase tracking-widest">Processing Logistics...</p></td></tr>
              ) : flatRsaRailcars.length === 0 ? (
                <tr><td colSpan={rsaColumns.length} className="py-12 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">No telemetry found in timeline.</td></tr>
              ) : (
                Object.entries(groupedRsaRows).map(([date, tracks]) => {
                  const dayStats = groupedRsaDayStats[date] || { cars: 0, vins: 0 };
                  return (
                    <React.Fragment key={date}>
                      <tr className="rsa-day-row bg-slate-50/80 border-b border-slate-200/50">
                        <td colSpan={rsaColumns.length} className="px-3 py-2">
                           <div className="flex items-center justify-between">
                             <div className="flex items-center gap-2">
                               <Calendar className="w-4 h-4 text-slate-700" />
                               <h3 className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{date}</h3>
                               <span className="rsa-pill px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider shadow-sm">
                                  {dayStats.cars} RC • {dayStats.vins} VINs
                               </span>
                             </div>
                             <button
                               type="button"
                               onClick={() => exportDayToCsv(date)}
                               className="rsa-action-button"
                             >
                               <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-500" />
                               Export
                             </button>
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
                            <tr className="rsa-track-row border-b border-slate-100">
                              <td colSpan={rsaColumns.length} className="px-5 py-1.5">
                                 <div className="flex items-center justify-between">
                                   <div className="flex items-center gap-3">
                                     <span className="font-bold text-[12px] text-slate-900 uppercase tracking-widest">Track {trackLabel}</span>
                                     <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-wider shadow-sm">
                                        {rcCount} RC • {vinCountSum} VINs
                                     </span>
                                   </div>
                                 </div>
                              </td>
                            </tr>
                            {Object.entries(spots).map(([spotName, railcars]) => {
                               const spotVinCount = railcars.reduce((acc, car) => acc + car.vins.length, 0);
                               return (
                                 <React.Fragment key={spotName}>
                                    <tr className="rsa-spot-row cursor-pointer border-b border-slate-100">
                                      <td colSpan={rsaColumns.length} className="px-5 py-1.5">
                                         <div className="flex items-center justify-between">
                                           <div className="flex items-center gap-2">
                                             <span className="text-[12px] font-bold text-slate-600 uppercase tracking-widest">{spotName}</span>
                                             <span className="text-[10px] font-bold text-slate-500 px-1.5 py-0.5">{railcars.length} RC | {spotVinCount} VINs</span>
                                           </div>
                                         </div>
                                      </td>
                                    </tr>
                                    {railcars.map((car, idx) => {
                                      const isSelected = car.reportId === selectedRsaReportId;
                                      return (
                                        <tr
                                          key={`${car.reportId}-${car.railcarId}-${idx}`}
                                          className={`rsa-car-row group cursor-pointer border-b border-slate-100 last:border-b-0 transition-all hover:bg-slate-50 ${isSelected ? "bg-blue-50/80 shadow-[inset_3px_0_0_0_rgba(37,99,235,0.45)]" : ""}`}
                                          onClick={() => {
                                            setSelectedRsaReportId(car.reportId);
                                            setSelectedRsaRailcarRow(car);
                                          }}
                                        >
                                          <td className="pl-10 pr-3 py-3">
                                            <div className="flex items-center gap-2">
                                                 <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">Railcar</span>
                                                 <span className="text-[16px] font-mono font-black tracking-widest text-slate-900">
                                                    {car.railcarId || 'UNASSIGNED'}
                                                 </span>
                                            </div>
                                          </td>
                                          <td className="px-3 py-3 text-[12px] font-black text-slate-700 uppercase tracking-tight">{car.track}</td>
                                          <td className="px-3 py-3 text-[12px] font-black text-slate-700 uppercase tracking-tight">{car.spot}</td>
                                          <td className="px-3 py-3 text-[12px] font-black text-slate-700 uppercase tracking-tight">{car.facilityName}</td>
                                          <td className="px-3 py-3 text-[12px] font-black text-slate-700 uppercase tracking-tight whitespace-nowrap">
                                            <div className="flex items-center justify-between gap-2">
                                              <span>{car.createdAt ? new Date(car.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}</span>
                                            </div>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </React.Fragment>
                               );
                            })}
                            <tr aria-hidden="true">
                              <td colSpan={rsaColumns.length} className="rsa-day-spacer border-0 p-0" />
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
              </DataTableShell>
            </div>
          </div>

          {/* Right Pane Sidebar for the Selected Report context block */}
          <aside className="sticky top-24 flex h-[calc(100vh-7rem)] min-h-0 self-start">
            {selectedRsaFullRow ? (
              <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl animate-in fade-in duration-500">
                <header className="p-6 bg-slate-50/80 border-b border-slate-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200 shadow-sm"><FileText className="w-6 h-6" /></div>
                    <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest px-2 py-1 bg-white border border-slate-200 rounded">{selectedRsaFullRow.report_id.substring(0,8)}</span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mt-1"><span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-700 bg-slate-100 px-2 py-0.5 rounded">Selected row</span></div>
                    <h3 className="text-[20px] font-black text-slate-900 tracking-tight mt-2 leading-tight">
                      {selectedRsaFullRow.subject || "Railcar Inbound Entry"}
                    </h3>
                    <p className="mt-2 text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                      Submitted {selectedRsaFullRow.created_at ? new Date(selectedRsaFullRow.created_at).toLocaleString() : "time unavailable"}
                    </p>
                  </div>
                </header>

                <div className="flex-1 min-h-0 space-y-6 overflow-y-auto p-6 custom-scrollbar">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Context Metadata</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
                        <span className="rsa-scope-label text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-400"/> TRACK</span>
                        <span className="rsa-value-text text-[20px] font-mono text-slate-900 tracking-widest">{selectedRsaRailcar?.track || selectedRsaFullRow.track || "—"}</span>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col">
                        <span className="rsa-scope-label text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">DESIGNATED SPOT</span>
                        <span className="rsa-value-text text-[20px] font-mono text-slate-900 tracking-widest">{selectedRsaRailcar?.spot || selectedRsaFullRow.spot || "—"}</span>
                      </div>
                    </div>

                    <div className="space-y-5 pt-4">
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
                          <div key={carIdx} className="space-y-3 pl-2 border-l-[3px] border-slate-300 py-1">
                             <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] bg-slate-100 px-2 py-0.5 rounded">{railcarNum}</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{allVins.length} Total VINs</span>
                             </div>
                             <div className="grid grid-cols-1 gap-2">
                                {Object.entries(deckVinsMap).map(([deckType, vins]) => (
                                    <div key={deckType} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                                        <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
                                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Deck {deckType}</p>
                                        </div>
                                        <div className="grid grid-cols-1 gap-1.5">
                                            {vins.map((vin, vIdx) => (
                                              <div key={vIdx} className="flex items-center gap-2">
                                                  <div className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-500">{vIdx + 1}</div>
                                                  <span className="text-[12px] font-mono font-black text-slate-800 tracking-wider">{vin}</span>
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
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="grid grid-cols-1 gap-3">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inspector</span>
                        <span className="text-[12px] font-bold text-slate-700">{selectedRsaFullRow.inspector_email || "System"}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Facility Focus</span>
                        <span className="text-[12px] font-bold text-slate-700 uppercase">{selectedRsaFullRow.facility || "Hub"}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-[1.5rem] border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center flex flex-col items-center justify-center min-h-[400px]">
                <div className="w-16 h-16 rounded-[1.25rem] bg-white flex items-center justify-center text-slate-300 mb-6 border border-slate-200 shadow-sm"><FileText className="w-6 h-6" /></div>
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Load Manifest Detail</h4>
                <p className="text-[12px] font-medium text-slate-400 mt-2 max-w-[220px]">Click any row in the registry table to view the selected row in the sidebar.</p>
              </div>
            )}
          </aside>
        </div>
      </section>

    </article>
  );
}
