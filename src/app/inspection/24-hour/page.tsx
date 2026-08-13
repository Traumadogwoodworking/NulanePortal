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

const TWENTY_FOUR_HOUR_PAGE_SIZE = 250;

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
  const withoutRepeatedShap = normalized.replace(/^(?:SHAP\/)+/i, "");
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
    "Time to Inspect / In Inventory",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseFacilityOptionsFromFilterMetadata(
  filterOptions: unknown,
  fallback: Array<{ value: string; count: number }>
): Array<{ value: string; count: number }> {
  if (!isRecord(filterOptions)) return fallback;
  const raw = filterOptions.facilities ?? filterOptions.facility;
  const countFromMap = (entries: Array<[string, unknown]>): Array<{ value: string; count: number }> => entries
    .map(([value, count]) => {
      if (!value.trim()) return null;
      const parsedCount = typeof count === "number" && Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
      return { value, count: parsedCount };
    })
    .filter((entry): entry is { value: string; count: number } => Boolean(entry));
  if (Array.isArray(raw)) {
    const parsed = raw
      .map((entry) => {
        if (typeof entry === "string" && entry.trim()) return { value: entry.trim(), count: 0 };
        if (entry && typeof entry === "object" && "value" in entry) {
          const value = String((entry as { value?: unknown }).value || "").trim();
          if (!value) return null;
          const countValue = Number((entry as { count?: unknown }).count);
          const count = Number.isFinite(countValue) ? Math.max(0, Math.floor(countValue)) : 0;
          return { value, count };
        }
        return null;
      })
      .filter((entry): entry is { value: string; count: number } => Boolean(entry))
      .sort((left, right) => left.value.localeCompare(right.value));
    if (parsed.length > 0) return parsed;
  }
  if (isRecord(raw)) {
    const parsed = countFromMap(Object.entries(raw as Record<string, unknown>));
    if (parsed.length > 0) return parsed.sort((left, right) => left.value.localeCompare(right.value));
  }
  return fallback;
}

function getInventoryRowKey(row: TwentyFourHourInspectionRow): string {
  return (row.inventory_row_id || row.id || row.vin || "").trim();
}

type InspectionTableProps = {
  data: TwentyFourHourInspectionResponse | null;
  rows: TwentyFourHourInspectionRow[];
  search: string;
  facilityOptions: Array<{ value: string; count: number }>;
  loading: boolean;
  error: string | null;
  facilityFilter: string;
  recordFilter: TwentyFourHourRecordFilter;
  onSearchChange: (value: string) => void;
  onFacilityChange: (value: string) => void;
  onRecordFilterChange: (value: TwentyFourHourRecordFilter) => void;
};

type TwentyFourHourPageError = {
  page: number;
  message: string;
};

function InspectionTable({
  data,
  rows,
  search,
  facilityOptions,
  loading,
  error,
  facilityFilter,
  recordFilter,
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
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Latest Active Inventory</h2>
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
              <p className="text-sm font-black text-slate-900">{rows.length.toLocaleString()} displayed</p>
              <p className="text-xs font-semibold text-slate-500">
                {data ? `${data.pagination.total_count.toLocaleString()} active inventory records` : "Inventory unavailable"}
              </p>
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
                    <div>
                      <span className="font-bold">{row.inspected ? "Time to inspect:" : "In inventory:"}</span>{" "}
                      {formatDuration(row.time_in_inventory_seconds)}
                    </div>
                    <div className="mt-1"><span className="font-bold">Until 24h:</span> {row.inspected ? "Complete" : formatDuration(row.time_until_24h_seconds)}</div>
                    <div className="mt-1 font-semibold text-slate-900"><span className="font-bold">Overdue:</span> {row.inspected ? "Complete" : formatDuration(row.overdue_seconds)}</div>
                  </td>
                  <td className="break-words px-3 py-2.5 leading-snug text-slate-600">
                    <div><span className="font-bold text-slate-700">At:</span> {formatDateTime(row.inspected_at)}</div>
                    {row.inspected ? (
                      <div className="mt-1 text-slate-700"><span className="font-bold">Turnaround:</span> {formatDuration(row.time_in_inventory_seconds)}</div>
                    ) : null}
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
                {loading ? "Loading the latest completed inventories…" : error ? "Current inventory data is unavailable. Use Retry above." : "No records match the current search and filters."}
              </td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function TwentyFourHourInspectionPage() {
  const { status } = usePortalSession();
  const [search, setSearch] = useState("");
  const [facilityFilter, setFacilityFilter] = useState("");
  const [recordFilter, setRecordFilter] = useState<TwentyFourHourRecordFilter>("all");
  const loadRunRef = useRef(0);
  const activeRequestRef = useRef<AbortController | null>(null);
  const seenRowsRef = useRef(new Set<string>());
  const [inventoryRows, setInventoryRows] = useState<TwentyFourHourInspectionRow[]>([]);
  const [metadataResponse, setMetadataResponse] = useState<TwentyFourHourInspectionResponse | null>(null);
  const [pagination, setPagination] = useState<TwentyFourHourInspectionResponse["pagination"] | null>(null);
  const [isLoadingInventory, setIsLoadingInventory] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<TwentyFourHourPageError | null>(null);

  const facilityFilterValue = facilityFilter.trim();
  const queryFilters = useMemo(() => ({
    pageSize: TWENTY_FOUR_HOUR_PAGE_SIZE,
  }), []);

  const loadInventoryPages = useCallback(async (options: { startPage?: number; preserveRows?: boolean } = {}) => {
    const startPage = Math.max(1, options.startPage ?? 1);
    const preserveRows = options.preserveRows ?? false;
    const runId = ++loadRunRef.current;

    const previousRequest = activeRequestRef.current;
    previousRequest?.abort();
    const request = new AbortController();
    activeRequestRef.current = request;
    const { signal } = request;
    if (!preserveRows) {
      seenRowsRef.current.clear();
      setInventoryRows([]);
      setMetadataResponse(null);
      setPagination(null);
    }
    setSummaryError(null);
    setPageError(null);
    setIsLoadingInventory(true);

    let nextPage = startPage;
    let hasReceivedAnyPage = false;
    try {
      while (runId === loadRunRef.current && !signal.aborted) {
        const pageResponse = await fetchTwentyFourHourInspectionDisplay({
          ...queryFilters,
          page: nextPage,
          signal,
        });
        if (signal.aborted || runId !== loadRunRef.current) return;
        hasReceivedAnyPage = true;

        if (nextPage === 1) {
          setMetadataResponse(pageResponse);
        }
        setPagination(pageResponse.pagination);

        const deduplicatedRows = pageResponse.rows.filter((row) => {
          const rowKey = getInventoryRowKey(row);
          if (!rowKey || seenRowsRef.current.has(rowKey)) return false;
          seenRowsRef.current.add(rowKey);
          return true;
        });
        if (deduplicatedRows.length > 0) {
          setInventoryRows((currentRows) => {
            if (nextPage === 1 && !preserveRows) return deduplicatedRows;
            return currentRows.concat(deduplicatedRows);
          });
        }
        if (!pageResponse.pagination.has_more) {
          return;
        }
        nextPage += 1;
      }
    } catch (error) {
      if (signal.aborted || runId !== loadRunRef.current) return;
      const message = error instanceof Error ? error.message : "Unable to load the current 24-hour snapshot.";
      if (hasReceivedAnyPage) {
        setPageError({ page: nextPage, message });
      } else {
        setSummaryError(message);
        setMetadataResponse(null);
        setPagination(null);
        setInventoryRows([]);
      }
    } finally {
      if (runId === loadRunRef.current && !signal.aborted) {
        setIsLoadingInventory(false);
      }
    }
  }, [queryFilters]);

  useEffect(() => {
    if (status !== "success") return;
    void loadInventoryPages();
  }, [status, loadInventoryPages]);

  const requestRefresh = useCallback(() => {
    void loadInventoryPages();
  }, [loadInventoryPages]);

  const facilityOptions = useMemo(() => parseFacilityOptionsFromFilterMetadata(
    metadataResponse?.filter_options,
    buildReturnedFacilityOptions(inventoryRows)
  ), [metadataResponse?.filter_options, inventoryRows]);
  const searchSummaryRows = useMemo(() => filterTwentyFourHourRows(inventoryRows, {
    search,
    yard: facilityFilterValue,
    recordFilter,
  }), [facilityFilterValue, inventoryRows, recordFilter, search]);
  const summaryCounts = useMemo(() => {
    const summary = metadataResponse?.summary;
    return {
      totalActive: summary?.total_active ?? 0,
      needsInspected: summary?.needs_inspected ?? 0,
      inspected: summary?.inspected ?? 0,
      critical: summary?.critical ?? 0,
      overdue: summary?.overdue ?? 0,
    };
  }, [metadataResponse?.summary]);
  const visibleRows = useMemo(() => orderTwentyFourHourRowsByPriority(searchSummaryRows), [searchSummaryRows]);
  const progressText = pagination ? `Showing ${inventoryRows.length.toLocaleString()} of ${pagination.total_count.toLocaleString()}` : "Loading";
  const summaryCards: Array<{ label: string; count: number; filter: TwentyFourHourRecordFilter }> = metadataResponse ? [
    { label: "Active", count: summaryCounts.totalActive, filter: "all" },
    { label: "Uninspected", count: summaryCounts.needsInspected, filter: "uninspected" },
    { label: "Inspected", count: summaryCounts.inspected, filter: "inspected" },
    { label: "Critical", count: summaryCounts.critical, filter: "critical" },
    { label: "Overdue", count: summaryCounts.overdue, filter: "overdue" },
  ] : [];
  const errors = summaryError || null;


  const setFacilityFilterValue = useCallback((value: string) => {
    if (value === facilityFilter) return;
    setFacilityFilter(value);
  }, [facilityFilter]);

  const setRecordFilterValue = useCallback((value: TwentyFourHourRecordFilter) => {
    const next = recordFilter === value && value !== "all" ? "all" : value;
    if (next === recordFilter) return;
    setRecordFilter(next);
  }, [recordFilter]);

  const retryPageLoad = useCallback(() => {
    if (!pageError) return;
    void loadInventoryPages({ startPage: pageError.page, preserveRows: true });
  }, [loadInventoryPages, pageError]);

  if (status !== "success") {
    return <EmptyState title="Session required" description="24-hour inspection display is available after the portal session loads." />;
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-black text-slate-900">24 Hour Inspection Display</h2>
            <p className="mt-1 text-xs text-slate-600">Current active inventory from each latest successfully completed facility feed, limited by the signed-in user&apos;s facility assignments.</p>
          </div>
          <div className="flex items-end justify-end">
            <Button variant="outline" size="sm" onClick={requestRefresh}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingInventory ? "animate-spin" : ""}`} />
              {isLoadingInventory ? "Refreshing" : "Refresh"}
            </Button>
          </div>
        </div>
        <div className="p-4">
          {errors ? (
            <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              <span>{errors}</span>
              <Button variant="outline" size="sm" onClick={requestRefresh}>Retry</Button>
            </div>
          ) : null}
          {isLoadingInventory && !metadataResponse ? (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-600">
              Loading the latest completed inventories…
            </div>
          ) : null}
          {metadataResponse ? (
            <>
              <div className="mb-3 text-xs text-slate-500">
                {progressText}
              </div>
              {metadataResponse.warnings.length > 0 ? (
                <div className="mb-3 rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  <p className="font-black uppercase tracking-[0.2em] text-amber-800">Warnings</p>
                  <p>{metadataResponse.warnings.join(" | ")}</p>
                </div>
              ) : null}
              {pageError ? (
                <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                  Failed loading page {pageError.page}: {pageError.message}
                  <div className="mt-2">
                    <Button variant="outline" size="sm" onClick={retryPageLoad}>
                      Retry page {pageError.page}
                    </Button>
                  </div>
                </div>
              ) : null}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {summaryCards.map(({ label, count, filter }) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={`Filter records by ${label}`}
                    aria-pressed={recordFilter === filter}
                    onClick={() => setRecordFilterValue(filter)}
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
            </>
          ) : null}
        </div>
      </Card>

      <InspectionTable
        data={metadataResponse}
        rows={visibleRows}
        search={search}
        facilityOptions={facilityOptions}
        loading={isLoadingInventory}
        error={errors}
        facilityFilter={facilityFilter}
        recordFilter={recordFilter}
        onSearchChange={setSearch}
        onFacilityChange={setFacilityFilterValue}
        onRecordFilterChange={setRecordFilterValue}
      />
    </div>
  );
}
