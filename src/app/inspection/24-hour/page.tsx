"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchTwentyFourHourInspectionDisplay,
  filterTwentyFourHourRows,
  getTwentyFourHourRequestId,
  TWENTY_FOUR_HOUR_STATUSES,
  type TwentyFourHourInspectionResponse,
  type TwentyFourHourInspectionRow,
  type TwentyFourHourRecordFilter,
} from "@/lib/services/twentyFourHourInspectionService";
import { usePortalSession } from "@/lib/portalSession";

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

function formatStatus(value: string): string {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildYardOptions(rows: TwentyFourHourInspectionRow[]) {
  const options = new Set(rows.map(getRowYard).filter(Boolean));
  return Array.from(options).sort((left, right) => left.localeCompare(right));
}

type InspectionTableProps = {
  data: TwentyFourHourInspectionResponse | null;
  rows: TwentyFourHourInspectionRow[];
  search: string;
  yardFilter: string;
  recordFilter: TwentyFourHourRecordFilter;
  yardOptions: string[];
  loading: boolean;
  error: string | null;
  onSearchChange: (value: string) => void;
  onYardChange: (value: string) => void;
  onRecordFilterChange: (value: TwentyFourHourRecordFilter) => void;
};

function InspectionTable({
  data,
  rows,
  search,
  yardFilter,
  recordFilter,
  yardOptions,
  loading,
  error,
  onSearchChange,
  onYardChange,
  onRecordFilterChange,
}: InspectionTableProps) {
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">Latest Active Snapshot Inventory</h2>
        <p className="mt-1 text-xs text-slate-500">Scroll this list; filters and column labels remain pinned.</p>
      </div>
      <div className="max-h-[calc(100vh-15rem)] min-h-[420px] overflow-auto" data-testid="inspection-table-scroll-container">
        <div className="sticky top-0 z-30 flex h-[104px] min-w-[1120px] items-end gap-3 border-b border-slate-300 bg-white px-4 py-3 shadow-sm md:h-[88px]">
          <label className="flex w-72 shrink-0 flex-col gap-1.5">
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
          <label className="flex w-48 shrink-0 flex-col gap-1.5">
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
          <label className="flex w-52 shrink-0 flex-col gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">Yard / Facility</span>
            <select
              aria-label="Filter records by yard or facility"
              value={yardFilter}
              onChange={(event) => onYardChange(event.target.value)}
              className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <option value="">All yards</option>
              {yardOptions.map((yard) => <option key={yard} value={yard}>{yard}</option>)}
            </select>
          </label>
          <div className="ml-auto shrink-0 pb-2 text-right" aria-live="polite">
            <p className="text-sm font-black text-slate-900">{rows.length} displayed</p>
            <p className="text-xs font-semibold text-slate-500">{data ? `${data.rows.length} active in snapshot` : "Snapshot unavailable"}</p>
          </div>
        </div>

        <table className="min-w-[1500px] divide-y divide-slate-200 text-sm">
          <thead className="sticky top-[104px] z-20 bg-slate-100 text-left text-xs font-black uppercase tracking-widest text-slate-600 shadow-[0_2px_5px_rgba(15,23,42,0.18)] md:top-[88px]">
            <tr>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">VIN</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">Inspection</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">Status</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">Yard</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">Row / Bay</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">First Seen</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">Last Seen</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">Time In Inventory</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">Until 24h</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">Overdue</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">Inspected At</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">Inspector</th>
              <th scope="col" className="whitespace-nowrap border-b border-slate-300 px-4 py-3">Report</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => {
              const reportId = getReportId(row);
              return (
                <tr key={row.inventory_row_id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-bold text-slate-900">{row.vin}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge variant={row.inspected ? "default" : "secondary"} className={row.inspected ? "bg-emerald-700 text-white" : ""}>
                      {row.inspected ? "Inspected" : "Uninspected"}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <Badge
                      variant="secondary"
                      className="border border-slate-300 font-black"
                      style={{
                        backgroundColor: row.severity === "overdue" ? "#000000" : row.display_background_color || "#ffffff",
                        color: row.severity === "overdue" ? "#ffffff" : row.display_text_color || "#0f172a",
                      }}
                    >
                      {row.display_label}
                    </Badge>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{getRowYard(row) || "Unavailable"}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-800">{getInventoryLocation(row) || "Unavailable"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(row.first_seen_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(row.last_seen_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700">{formatDuration(row.time_in_inventory_seconds)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.inspected ? "Complete" : formatDuration(row.time_until_24h_seconds)}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{row.inspected ? "Complete" : formatDuration(row.overdue_seconds)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDateTime(row.inspected_at)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{row.inspector || row.user || "Unavailable"}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    {reportId ? (
                      <Link href={`/reports/damage?focus=${encodeURIComponent(reportId)}`} className="text-xs font-black uppercase tracking-widest text-blue-700 hover:text-blue-900">Open</Link>
                    ) : <span className="text-xs font-semibold text-slate-400">None</span>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr><td colSpan={13} className="px-4 py-12 text-center text-sm font-semibold text-slate-500">
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
  const { isShap, status } = usePortalSession();
  const [data, setData] = useState<TwentyFourHourInspectionResponse | null>(null);
  const [search, setSearch] = useState("");
  const [yardFilter, setYardFilter] = useState("");
  const [recordFilter, setRecordFilter] = useState<TwentyFourHourRecordFilter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [failedRequestId, setFailedRequestId] = useState("");
  const [lastSuccessfulRefresh, setLastSuccessfulRefresh] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const requestSequence = useRef(0);

  useEffect(() => {
    if (!isShap) {
      return;
    }
    const sequence = ++requestSequence.current;
    const controller = new AbortController();
    void fetchTwentyFourHourInspectionDisplay({ signal: controller.signal })
      .then((response) => {
        if (sequence !== requestSequence.current) return;
        setData(response);
        setLastSuccessfulRefresh(new Date().toISOString());
        setFailedRequestId("");
      })
      .catch((caught) => {
        if (sequence !== requestSequence.current || controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "Unable to load the current 24-hour snapshot.");
        setFailedRequestId(getTwentyFourHourRequestId(caught));
      })
      .finally(() => {
        if (sequence === requestSequence.current) setLoading(false);
      });
    return () => controller.abort();
  }, [isShap, reloadToken]);

  const yardOptions = useMemo(() => buildYardOptions(data?.rows ?? []), [data?.rows]);
  const visibleRows = useMemo(() => filterTwentyFourHourRows(data?.rows ?? [], {
    search,
    yard: yardFilter,
    recordFilter,
  }), [data?.rows, recordFilter, search, yardFilter]);

  const refresh = () => {
    setLoading(true);
    setError(null);
    setReloadToken((current) => current + 1);
  };

  if (status !== "success") {
    return <EmptyState title="Session required" description="24-hour inspection display is available after the portal session loads." />;
  }
  if (!isShap) {
    return <EmptyState title="Restricted" description="The 24-hour inspection display is only available for SHAP." />;
  }

  return (
    <div className="space-y-4">
      <Card className="border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-base font-black text-slate-900">24 Hour Inspection Display</h2>
            <p className="mt-1 text-xs text-slate-600">Current active inventory from the latest successfully completed development snapshot.</p>
          </div>
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Refreshing" : "Refresh"}
          </Button>
        </div>
        <div className="p-4">
          {error ? (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={refresh}>Retry</Button>
            </div>
          ) : null}
          {loading && !data ? <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm font-semibold text-slate-600">Loading the latest completed snapshot…</div> : null}
          {data ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                ["Active", data.summary.total_active],
                ["Uninspected", data.summary.needs_inspected],
                ["Inspected", data.summary.inspected],
                ["Critical", data.summary.critical],
                ["Overdue", data.summary.overdue],
              ].map(([label, count]) => (
                <div key={String(label)} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900">{count}</p>
                </div>
              ))}
            </div>
          ) : null}
          {process.env.NODE_ENV !== "production" ? (
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-600" aria-label="Development snapshot diagnostics">
              <span>result: {error ? "failed" : data ? "success" : "pending"}</span>
              <span>last refresh: {lastSuccessfulRefresh ? formatDateTime(lastSuccessfulRefresh) : "none"}</span>
              <span>snapshot: {data ? formatDateTime(data.snapshot.capture_time) : "unavailable"}</span>
              <span>displayed: {visibleRows.length}</span>
              <span>excluded: {data ? data.metadata.excluded_stale_rows + data.metadata.rejected_malformed_rows : 0}</span>
              <span>request: {failedRequestId || data?.request_id || "pending"}</span>
            </div>
          ) : null}
        </div>
      </Card>

      <InspectionTable
        data={data}
        rows={visibleRows}
        search={search}
        yardFilter={yardFilter}
        recordFilter={recordFilter}
        yardOptions={yardOptions}
        loading={loading}
        error={error}
        onSearchChange={setSearch}
        onYardChange={setYardFilter}
        onRecordFilterChange={setRecordFilter}
      />
    </div>
  );
}
