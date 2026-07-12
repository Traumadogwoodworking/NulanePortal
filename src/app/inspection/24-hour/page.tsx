"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  fetchTwentyFourHourInspectionDisplay,
  type TwentyFourHourInspectionResponse,
  type TwentyFourHourInspectionRow,
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
  });
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getAgeHours(row: TwentyFourHourInspectionRow, generatedAt?: string): number {
  const explicit = readNumber(row.age_hours);
  if (explicit !== null) return explicit;
  if (!row.first_seen_at) return 0;
  const start = new Date(row.first_seen_at).getTime();
  const end = generatedAt ? new Date(generatedAt).getTime() : Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return (end - start) / (1000 * 60 * 60);
}

function formatHours(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0h";
  if (value < 1) return `${Math.round(value * 60)}m`;
  const hours = Math.floor(value);
  const minutes = Math.round((value - hours) * 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

function readRowString(row: TwentyFourHourInspectionRow, keys: Array<keyof TwentyFourHourInspectionRow>): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function getRowYard(row: TwentyFourHourInspectionRow): string {
  return readRowString(row, ["yard_label", "yard_name", "yard", "location_label", "location_name", "facility"]);
}

function getRowYardValue(row: TwentyFourHourInspectionRow): string {
  return readRowString(row, ["yard_id", "yard", "yard_name", "yard_label", "location_id", "facility_id"]);
}

function formatBucket(value?: string | null): string {
  return (value ?? "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isInspected(row: TwentyFourHourInspectionRow): boolean {
  const bucket = (row.bucket ?? "").toLowerCase();
  return Boolean(row.inspected_at || bucket === "inspected");
}

function getSeverityLabel(row: TwentyFourHourInspectionRow): string {
  return row.severity || row.display_label || formatBucket(row.bucket);
}

function getReportId(row: TwentyFourHourInspectionRow): string {
  return readRowString(row, ["report_id", "reportId"]);
}

function buildYardOptions(rows: TwentyFourHourInspectionRow[]) {
  const options = new Map<string, { value: string; label: string }>();
  rows.forEach((row) => {
    const label = getRowYard(row);
    if (!label) return;
    const value = getRowYardValue(row) || label;
    if (!options.has(value)) options.set(value, { value, label });
  });
  return Array.from(options.values()).sort((left, right) => left.label.localeCompare(right.label));
}

type InspectionRowsTableProps = {
  rows: TwentyFourHourInspectionRow[];
  generatedAt?: string;
  loading: boolean;
  title: string;
  emptyMessage: string;
  showInspectionFields: boolean;
};

function InspectionRowsTable({
  rows,
  generatedAt,
  loading,
  title,
  emptyMessage,
  showInspectionFields,
}: InspectionRowsTableProps) {
  const columnCount = showInspectionFields ? 12 : 10;
  return (
    <Card className="overflow-hidden border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-black uppercase tracking-widest text-slate-700">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-black uppercase tracking-widest text-slate-500">
            <tr>
              <th className="px-4 py-3">VIN</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Severity</th>
              <th className="px-4 py-3">Yard</th>
              <th className="px-4 py-3">First Seen</th>
              <th className="px-4 py-3">Last Seen</th>
              <th className="px-4 py-3">Time In Inventory</th>
              <th className="px-4 py-3">Until 24h</th>
              <th className="px-4 py-3">Overdue</th>
              {showInspectionFields ? <th className="px-4 py-3">Inspected At</th> : null}
              {showInspectionFields ? <th className="px-4 py-3">Inspector</th> : null}
              <th className="px-4 py-3">Report</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => {
              const inspected = isInspected(row);
              const ageHours = getAgeHours(row, generatedAt);
              const until24 = Math.max(24 - ageHours, 0);
              const overdue = Math.max(ageHours - 24, 0);
              const reportId = getReportId(row);
              return (
                <tr key={`${row.vin ?? "vin"}-${row.source_import_id ?? index}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-900">{row.vin || "Unavailable"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={inspected ? "default" : "secondary"} className={inspected ? "bg-emerald-600 text-white" : ""}>
                      {inspected ? "Inspected" : "Not inspected"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge
                      variant="secondary"
                      className="border-transparent"
                      style={{
                        backgroundColor: row.display_background || "#e2e8f0",
                        color: row.display_text_color || "#0f172a",
                      }}
                    >
                      {getSeverityLabel(row)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{getRowYard(row) || "All yards"}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(row.first_seen_at)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDateTime(row.last_seen_at)}</td>
                  <td className="px-4 py-3 font-semibold text-slate-700">{formatHours(ageHours)}</td>
                  <td className="px-4 py-3 text-slate-700">{inspected ? "Complete" : formatHours(until24)}</td>
                  <td className={`px-4 py-3 font-semibold ${overdue > 0 && !inspected ? "text-red-700" : "text-slate-500"}`}>
                    {inspected ? "Complete" : formatHours(overdue)}
                  </td>
                  {showInspectionFields ? <td className="px-4 py-3 text-slate-600">{formatDateTime(row.inspected_at)}</td> : null}
                  {showInspectionFields ? <td className="px-4 py-3 text-slate-700">{row.inspector || row.user || "Unavailable"}</td> : null}
                  <td className="px-4 py-3">
                    {reportId ? (
                      <Link
                        href={`/reports/damage?focus=${encodeURIComponent(reportId)}`}
                        className="text-xs font-black uppercase tracking-widest text-blue-700 hover:text-blue-900"
                      >
                        Open
                      </Link>
                    ) : (
                      <span className="text-xs font-semibold text-slate-400">None</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!loading && rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-4 py-10 text-center text-sm font-semibold text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
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
  const [yardFilter, setYardFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!isShap) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchTwentyFourHourInspectionDisplay(yardFilter ? { yard: yardFilter } : {})
      .then((response) => {
        if (!cancelled) setData(response);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Unable to load 24-hour inspections.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isShap, reloadToken, yardFilter]);

  const rows = useMemo(() => data?.rows ?? [], [data?.rows]);
  const yardOptions = useMemo(() => buildYardOptions(rows), [rows]);
  const visibleRows = useMemo(() => {
    if (!yardFilter) return rows;
    return rows.filter((row) => {
      const rowValue = getRowYardValue(row);
      const rowLabel = getRowYard(row);
      return rowValue === yardFilter || rowLabel === yardFilter;
    });
  }, [rows, yardFilter]);
  const uninspectedRows = useMemo(() => visibleRows.filter((row) => !isInspected(row)), [visibleRows]);
  const inspectedRows = useMemo(() => visibleRows.filter((row) => isInspected(row)), [visibleRows]);

  if (status !== "success") {
    return <EmptyState title="Session required" description="24-hour inspection display is available after the portal session loads." />;
  }

  if (!isShap) {
    return <EmptyState title="Restricted" description="The 24-hour inspection display is only available for SHAP." />;
  }

  const totals = data?.totals ?? {};

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader
          title="24 Hour Inspection Display"
          subtitle="Active inventory matched against submitted 24-hour inspections."
          actions={
            <Button variant="outline" size="sm" onClick={() => setReloadToken((current) => current + 1)} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />
        <CardContent>
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Active</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{totals.total_active ?? visibleRows.length}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Needs Inspected</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{totals.needs_inspected ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Inspected</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{totals.inspected ?? 0}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Archive Window</p>
              <p className="mt-2 text-2xl font-black text-slate-900">{data?.archive_window_days ?? 3}d</p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
            <label className="flex w-64 flex-col gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">Yard</span>
              <select
                value={yardFilter}
                onChange={(event) => setYardFilter(event.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-slate-300"
              >
                <option value="">All yards</option>
                {yardOptions.map((yard) => (
                  <option key={yard.value} value={yard.value}>
                    {yard.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-sm font-semibold text-slate-500">
              {loading ? "Loading..." : `${visibleRows.length} row${visibleRows.length === 1 ? "" : "s"}`}
            </p>
          </div>
        </CardContent>
      </Card>

      <InspectionRowsTable
        rows={uninspectedRows}
        generatedAt={data?.generated_at}
        loading={loading}
        title="Raw Uninspected Inventory"
        emptyMessage="No uninspected 24-hour inventory rows matched this view."
        showInspectionFields={false}
      />

      <InspectionRowsTable
        rows={inspectedRows}
        generatedAt={data?.generated_at}
        loading={loading}
        title="Inspected Inventory"
        emptyMessage="No inspected 24-hour inventory rows matched this view."
        showInspectionFields
      />
    </div>
  );
}
