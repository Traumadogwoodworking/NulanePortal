"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Download, RefreshCw } from "lucide-react";
import { saveAs } from "file-saver";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchTwentyFourHourInspectionDisplay,
  filterTwentyFourHourRows,
  orderTwentyFourHourRowsByPriority,
  TWENTY_FOUR_HOUR_STATUSES,
  type TwentyFourHourInspectionResponse,
  type TwentyFourHourInspectionRow,
  type TwentyFourHourRecordFilter,
} from "@/lib/services/twentyFourHourInspectionService";
import { usePortalSession } from "@/lib/portalSession";

const TWENTY_FOUR_HOUR_AUTO_REFRESH_MS = 30_000;
const TWENTY_FOUR_HOUR_EVENT_REFRESH_THROTTLE_MS = 2_000;

function formatDateTime(value?: string | null): string {
  if (!value) return "Unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unavailable";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

function formatDuration(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function readRowString(row: TwentyFourHourInspectionRow, keys: Array<keyof TwentyFourHourInspectionRow>): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function normalizeTwentyFourHourLocation(value: string): string {
  const normalized = value.trim().replace(/\\/g, "/").replace(/\/{2,}/g, "/");
  const withoutRepeatedShap = normalized.replace(/^(?:SHAP\/){2,}/i, "");
  return withoutRepeatedShap || normalized;
}

function getRowYard(row: TwentyFourHourInspectionRow): string {
  return readRowString(row, ["yard_label", "yard_name", "yard", "facility", "facility_code"]);
}

function getRowFacility(row: TwentyFourHourInspectionRow): string {
  return readRowString(row, ["facility", "facility_code", "facility_id", "yard_label", "yard_name", "yard"]);
}

function getInventoryLocation(row: TwentyFourHourInspectionRow): string {
  return normalizeTwentyFourHourLocation(readRowString(row, [
    "row",
    "spot",
    "confirmed_bay",
    "confirmedBay",
    "inventory_bay",
    "inventoryBay",
    "bay",
    "location",
    "sector",
    "row_number",
  ]));
}

function getReportId(row: TwentyFourHourInspectionRow): string {
  return row.report_id || row.reportId || "";
}

function csvCell(value: string | number): string {
  const text = String(value);
  const excelSafeText = /^[=+\-@]/.test(text.trimStart()) ? `'${text}` : text;
  return `"${excelSafeText.replace(/"/g, '""')}"`;
}

function buildTwentyFourHourVisibleCsv(rows: TwentyFourHourInspectionRow[]): string {
  const headings = [
    "Work Order",
    "VIN",
    "Inspection",
    "Status",
    "Yard / Facility",
    "Row / Bay",
    "First Seen",
    "Last Seen",
    "Time In Inventory",
    "Until 24h",
    "Overdue",
    "Inspected At",
    "Inspector",
    "Report ID",
  ];
  const exportRows = rows.map((row, index) => [
    index + 1,
    row.vin,
    row.inspected ? "Inspected" : "Uninspected",
    row.display_label,
    getRowYard(row) || "Unavailable",
    getInventoryLocation(row) || "Unavailable",
    formatDateTime(row.first_seen_at),
    formatDateTime(row.last_seen_at),
    formatDuration(row.time_in_inventory_seconds),
    row.inspected ? "Complete" : formatDuration(row.time_until_24h_seconds),
    row.inspected ? "Complete" : formatDuration(row.overdue_seconds),
    formatDateTime(row.inspected_at),
    row.inspector || row.user || "Unavailable",
    getReportId(row) || "None",
  ]);
  return [headings, ...exportRows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

function formatStatus(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildReturnedFacilityOptions(rows: TwentyFourHourInspectionRow[]) {
  const inventoryCounts = new Map<string, number>();
  rows.forEach((row) => {
    const facility = getRowFacility(row);
    if (!facility) return;
    inventoryCounts.set(facility, (inventoryCounts.get(facility) ?? 0) + 1);
  });
  return Array.from(inventoryCounts.entries())
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value));
}

type InspectionTableProps = {
  data: TwentyFourHourInspectionResponse | null;
  rows: TwentyFourHourInspectionRow[];
  search: string;
  facilityFilter: string;
  recordFilter: TwentyFourHourRecordFilter;
  facilityOptions: Array<{ value: string; count: number }>;
  loading: boolean;
  error: string | null;
  onSearchChange: (value: string) => void;
  onFacilityChange: (value: string) => void;
  onRecordFilterChange: (value: TwentyFourHourRecordFilter) => void;
};

function InspectionTable({
  data,
  rows,
  search,
  facilityFilter,
  recordFilter,
  facilityOptions,
  loading,
  error,
  onSearchChange,
  onFacilityChange,
  onRecordFilterChange,
}: InspectionTableProps) {
  const exportVisibleRows = () => {
    const date = new Date().toISOString().slice(0, 10);
    saveAs(
      new Blob(["\uFEFF", buildTwentyFourHourVisibleCsv(rows)], { type: "text/csv;charset=utf-8;" }),
      `24-hour-work-queue-${date}.csv`
    );
  };

  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Latest Active Snapshot Inventory</h2>
        <p className="mt-1 text-xs text-slate-500">All record fields are grouped to fit the available width; filters and column labels remain pinned.</p>
      </div>
      <div className="max-h-[calc(100vh-15rem)] min-h-[420px] overflow-auto" data-testid="inspection-table-scroll-container">
        <div className="sticky top-0 z-30 grid min-h-[104px] grid-cols-2 items-end gap-3 border-b border-slate-300 bg-white px-4 py-3 shadow-sm md:min-h-[88px] md:grid-cols-[minmax(200px,2fr)_minmax(140px,1fr)_minmax(160px,1fr)_auto]">
          <label className="col-span-2 flex min-w-0 flex-col gap-1.5 md:col-span-1">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Search all records</span>
            <input
              aria-label="Search inspected and uninspected records"
              type="search"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="VIN, row, bay, report, facility"
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Records</span>
            <select
              aria-label="Filter records by inspection state or status"
              value={recordFilter}
              onChange={(event) => onRecordFilterChange(event.target.value as TwentyFourHourRecordFilter)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="all">All records</option>
              <option value="uninspected">Uninspected</option>
              <option value="inspected">Inspected</option>
              {TWENTY_FOUR_HOUR_STATUSES.filter((status) => status !== "inspected").map((status) => (
                <option key={status} value={status}>{formatStatus(status)}</option>
              ))}
            </select>
          </label>
          <label className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Facility inventory</span>
            <select
              aria-label="Filter returned inventory by facility"
              value={facilityFilter}
              onChange={(event) => onFacilityChange(event.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">All returned facilities</option>
              {facilityOptions.map(({ value, count }) => (
                <option key={value} value={value}>
                  {value} ({count} {count === 1 ? "inventory" : "inventories"})
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end justify-end gap-3 pb-1 text-right">
            <div aria-live="polite">
              <p className="text-sm font-black text-slate-900">{rows.length} displayed</p>
              <p className="text-xs font-semibold text-slate-500">{data ? `${data.rows.length} active in snapshot` : "Snapshot unavailable"}</p>
            </div>
            <Button type="button" variant="outline" size="sm" disabled={rows.length === 0} onClick={exportVisibleRows}>
              <Download className="mr-1.5 h-4 w-4" />
              Export to Excel
            </Button>
          </div>
        </div>

        <table className="w-full table-fixed divide-y divide-slate-200 text-xs">
          <colgroup>
            <col className="w-[16%]" />
            <col className="w-[13%]" />
            <col className="w-[15%]" />
            <col className="w-[17%]" />
            <col className="w-[16%]" />
            <col className="w-[17%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead className="sticky top-[104px] z-20 bg-slate-100 text-left text-xs font-black uppercase tracking-widest text-slate-600 shadow-[0_2px_5px_rgba(15,23,42,0.18)] md:top-[88px]">
            <tr>
              <th scope="col" className="border-b border-slate-300 px-3 py-2.5">VIN</th>
              <th scope="col" className="border-b border-slate-300 px-3 py-2.5">Status</th>
              <th scope="col" className="border-b border-slate-300 px-3 py-2.5">Location</th>
              <th scope="col" className="border-b border-slate-300 px-3 py-2.5">Inventory Seen</th>
              <th scope="col" className="border-b border-slate-300 px-3 py-2.5">24 Hour Timing</th>
              <th scope="col" className="border-b border-slate-300 px-3 py-2.5">Inspection Detail</th>
              <th scope="col" className="border-b border-slate-300 px-2 py-2.5 text-center">Report</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => {
              const reportId = getReportId(row);
              return (
                <tr key={row.inventory_row_id} className="align-top hover:bg-slate-50">
                  <td className="break-all px-3 py-2.5 font-mono font-bold text-slate-900">
                    {row.vin}
                    <div className="mt-1 font-sans">
                      <Badge variant={row.inspected ? "default" : "secondary"} className={row.inspected ? "bg-emerald-700 text-white" : ""}>
                        {row.inspected ? "Inspected" : "Uninspected"}
                      </Badge>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="secondary"
                      className="max-w-full whitespace-normal border border-slate-300 text-center font-black leading-tight"
                      style={{
                        backgroundColor: row.severity === "overdue" ? "#000000" : row.display_background_color || "#ffffff",
                        color: row.severity === "overdue" ? "#ffffff" : row.display_text_color || "#0f172a",
                      }}
                    >
                      {row.display_label}
                    </Badge>
                  </td>
                  <td className="break-words px-3 py-2.5 text-slate-700">
                    <div className="font-semibold">{getRowYard(row) || "Unavailable"}</div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      <span className="font-sans font-bold">Row / Bay: </span>
                      <span className="font-mono">{getInventoryLocation(row) || "Unavailable"}</span>
                    </div>
                  </td>
                  <td className="break-words px-3 py-2.5 leading-snug text-slate-600">
                    <div><span className="font-bold text-slate-700">First:</span> {formatDateTime(row.first_seen_at)}</div>
                    <div className="mt-1"><span className="font-bold text-slate-700">Last:</span> {formatDateTime(row.last_seen_at)}</div>
                  </td>
                  <td className="break-words px-3 py-2.5 leading-snug text-slate-700">
                    <div><span className="font-bold">In inventory:</span> {formatDuration(row.time_in_inventory_seconds)}</div>
                    <div className="mt-1"><span className="font-bold">Until 24h:</span> {row.inspected ? "Complete" : formatDuration(row.time_until_24h_seconds)}</div>
                    <div className="mt-1 font-semibold text-slate-900"><span className="font-bold">Overdue:</span> {row.inspected ? "Complete" : formatDuration(row.overdue_seconds)}</div>
                  </td>
                  <td className="break-words px-3 py-2.5 leading-snug text-slate-600">
                    <div><span className="font-bold text-slate-700">At:</span> {formatDateTime(row.inspected_at)}</div>
                    <div className="mt-1 text-slate-700"><span className="font-bold">By:</span> {row.inspector || row.user || "Unavailable"}</div>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {reportId ? (
                      <Link href={`/reports/damage?focus=${encodeURIComponent(reportId)}`} className="text-xs font-black uppercase tracking-widest text-blue-700 hover:text-blue-900">Open</Link>
                    ) : <span className="text-xs font-semibold text-slate-400">None</span>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-sm font-semibold text-slate-500">
                {loading ? "Loading the latest completed snapshot…" : error ? "Current snapshot data is unavailable. Use Retry above." : "No records match the current search and filters."}
              </td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function TwentyFourHourInspectionPage() {
  const { status, assignedLocationIds = [], selectedLocationId, locationLocked } = usePortalSession();
  const [data, setData] = useState<TwentyFourHourInspectionResponse | null>(null);
  const [search, setSearch] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");
  const [recordFilter, setRecordFilter] = useState<TwentyFourHourRecordFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestSequence = useRef(0);
  const lastEventRefreshAt = useRef(0);
  const requestFacility = useMemo(() => {
    if (assignedLocationIds.length === 1) return assignedLocationIds[0];
    if (locationLocked && selectedLocationId) return selectedLocationId;
    return "";
  }, [assignedLocationIds, locationLocked, selectedLocationId]);

  const requestRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (status !== "success") return;

    const refreshCurrentFacility = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastEventRefreshAt.current < TWENTY_FOUR_HOUR_EVENT_REFRESH_THROTTLE_MS) return;
      lastEventRefreshAt.current = now;
      requestRefresh();
    };
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) refreshCurrentFacility();
    };
    const intervalId = window.setInterval(refreshCurrentFacility, TWENTY_FOUR_HOUR_AUTO_REFRESH_MS);

    window.addEventListener("focus", refreshCurrentFacility);
    window.addEventListener("online", refreshCurrentFacility);
    window.addEventListener("pageshow", handlePageShow);
    document.addEventListener("visibilitychange", refreshCurrentFacility);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshCurrentFacility);
      window.removeEventListener("online", refreshCurrentFacility);
      window.removeEventListener("pageshow", handlePageShow);
      document.removeEventListener("visibilitychange", refreshCurrentFacility);
    };
  }, [requestRefresh, status]);

  useEffect(() => {
    if (status !== "success") {
      return;
    }
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    void fetchTwentyFourHourInspectionDisplay({
      signal: controller.signal,
      ...(requestFacility ? { facility: requestFacility } : {}),
    })
      .then((response) => {
        if (sequence !== requestSequence.current) return;
        setData(response);
      })
      .catch((caught) => {
        if (sequence !== requestSequence.current || controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "Unable to load the current 24-hour snapshot.");
      })
      .finally(() => {
        if (sequence === requestSequence.current) setLoading(false);
      });
    return () => controller.abort();
  }, [reloadToken, requestFacility, status]);

  const facilityOptions = useMemo(() => buildReturnedFacilityOptions(data?.rows ?? []), [data?.rows]);
  const summaryRows = useMemo(() => filterTwentyFourHourRows(data?.rows ?? [], {
    search,
    yard: facilityFilter,
    recordFilter: "all",
  }), [data?.rows, facilityFilter, search]);
  const filteredSummary = useMemo(() => {
    let needsInspected = 0;
    let inspected = 0;
    let critical = 0;
    let overdue = 0;
    for (const row of summaryRows) {
      if (row.inspected) inspected += 1;
      else needsInspected += 1;
      if (row.severity === "critical") critical += 1;
      if (row.severity === "overdue") overdue += 1;
    }
    return {
      totalActive: summaryRows.length,
      needsInspected,
      inspected,
      critical,
      overdue,
    };
  }, [summaryRows]);
  const visibleRows = useMemo(() => orderTwentyFourHourRowsByPriority(filterTwentyFourHourRows(data?.rows ?? [], {
    search,
    yard: facilityFilter,
    recordFilter,
  })), [data?.rows, facilityFilter, recordFilter, search]);

  const summaryCards: Array<{
    label: string;
    count: number;
    filter: TwentyFourHourRecordFilter;
  }> = data ? [
    { label: "Active", count: filteredSummary.totalActive, filter: "all" },
    { label: "Uninspected", count: filteredSummary.needsInspected, filter: "uninspected" },
    { label: "Inspected", count: filteredSummary.inspected, filter: "inspected" },
    { label: "Critical", count: filteredSummary.critical, filter: "critical" },
    { label: "Overdue", count: filteredSummary.overdue, filter: "overdue" },
  ] : [];

  if (status !== "success") {
    return <EmptyState title="Session required" description="24-hour inspection display is available after the portal session loads." />;
  }
  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-black text-slate-900">24 Hour Inspection Display</h2>
            <p className="mt-1 text-xs text-slate-600">Current active inventory from the latest successfully completed snapshot, limited by the signed-in user&apos;s facility assignments. Refreshes every 30 seconds while this tab is visible.</p>
          </div>
          <div className="flex items-end justify-end">
            <Button variant="outline" size="sm" onClick={requestRefresh}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              {loading ? "Refreshing" : "Refresh"}
            </Button>
          </div>
        </div>
        <div className="p-4">
          {error ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={requestRefresh}>Retry</Button>
            </div>
          ) : null}
          {loading && !data ? <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-600">Loading the latest completed snapshot…</div> : null}
          {data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {summaryCards.map(({ label, count, filter }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={`Filter records by ${label}`}
                  aria-pressed={recordFilter === filter}
                  onClick={() => setRecordFilter((current) => current === filter && filter !== "all" ? "all" : filter)}
                  className={`rounded-lg border p-3 text-left transition focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
                    recordFilter === filter
                      ? "border-slate-700 bg-slate-900 shadow-sm"
                      : "border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-slate-100"
                  }`}
                >
                  <p className={`text-[10px] font-black uppercase tracking-widest ${recordFilter === filter ? "text-slate-300" : "text-slate-500"}`}>{label}</p>
                  <p className={`mt-1 text-2xl font-black ${recordFilter === filter ? "text-white" : "text-slate-900"}`}>{count}</p>
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </Card>

      <InspectionTable
        data={data}
        rows={visibleRows}
        search={search}
        facilityFilter={facilityFilter}
        recordFilter={recordFilter}
        facilityOptions={facilityOptions}
        loading={loading}
        error={error}
        onSearchChange={setSearch}
        onFacilityChange={setFacilityFilter}
        onRecordFilterChange={setRecordFilter}
      />
    </div>
  );
}
