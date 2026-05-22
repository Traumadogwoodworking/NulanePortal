"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { usePortalSession } from "@/lib/portalSession";
import { apiFetch } from "@/lib/apiClient";
import { ControlFilterBar } from "@/components/control/ControlFilterBar";
import { ControlMetricTile } from "@/components/control/ControlMetricTile";
import { ControlTableShell } from "@/components/control/ControlTableShell";
import { ControlDetailPanel, type ControlDetailField } from "@/components/control/ControlDetailPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface AuditRow {
  action?: string;
  entity_type?: string;
  entity_id?: string;
  created_at?: string;
  actor_email?: string;
  actor_user_id?: string;
  before_state?: Record<string, unknown> | null;
  after_state?: Record<string, unknown> | null;
}

export default function ControlAuditPage() {
  const { organizationId } = usePortalSession();
  const [auditRows, setAuditRows] = useState<AuditRow[]>([]);
  const [settingsRows, setSettingsRows] = useState<AuditRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    setError(null);
    try {
      const [auditPayload, settingsPayload] = await Promise.all([
        apiFetch<{ audit_logs: AuditRow[] }>(`/admin/audit-log?organizationId=${encodeURIComponent(organizationId)}&limit=50`),
        apiFetch<{ logs: AuditRow[] }>(`/admin/settings-audit-log?limit=50`),
      ]);
      setAuditRows(Array.isArray(auditPayload.audit_logs) ? auditPayload.audit_logs : []);
      setSettingsRows(Array.isArray(settingsPayload.logs) ? settingsPayload.logs : []);
      setSelectedId((current) => current ?? auditPayload.audit_logs?.[0]?.entity_id ?? settingsPayload.logs?.[0]?.entity_id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load audit history.");
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    const merged = [...auditRows, ...settingsRows].map((row, index) => ({
      id: `${row.created_at || "audit"}-${row.entity_id || row.action || index}`,
      ...row,
      source: auditRows.includes(row) ? "operator" : "settings",
    }));
    return merged.filter((row) =>
      !query
        ? true
        : [row.action, row.entity_type, row.entity_id, row.actor_email, row.actor_user_id]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(query)
    );
  }, [auditRows, search, settingsRows]);

  const selectedRow = rows.find((row) => row.id === selectedId) ?? rows[0] ?? null;

  useEffect(() => {
    if (rows.length && !rows.some((row) => row.id === selectedId)) {
      setSelectedId(rows[0].id);
    }
  }, [rows, selectedId]);

  if (!organizationId) {
    return <div className="rounded-[1.75rem] border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] p-6 text-[color:var(--metric-warning-fg)]">Audit surface requires an organization session.</div>;
  }

  if (loading) {
    return <div className="rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-5 text-[color:var(--text-primary)]/82">Loading audit logs...</div>;
  }

  if (error) {
    return <div className="rounded-[1.75rem] border border-[color:var(--metric-danger-border)] bg-[color:var(--metric-danger-bg)] p-6 text-[color:var(--metric-danger-fg)]">{error}</div>;
  }

  const totalRows = auditRows.length + settingsRows.length;

  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ControlMetricTile label="Audit rows" value={auditRows.length} detail="Operator actions" />
        <ControlMetricTile label="Settings rows" value={settingsRows.length} detail="Preference changes" tone="neutral" />
        <ControlMetricTile label="Total trace rows" value={totalRows} detail="Combined visibility" tone="positive" />
        <ControlMetricTile label="Search matches" value={rows.length} detail="Current filter results" tone={rows.length ? "neutral" : "warning"} />
      </div>

      <ControlFilterBar
        search={search}
        onSearch={setSearch}
        placeholder="Search action, actor, entity, or ID"
        actions={
          <button
            type="button"
            onClick={() => void loadAudit()}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)] hover:bg-[color:var(--surface-panel)]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
        summary={<StatusBadge label={`${rows.length} matches`} tone="neutral" />}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(340px,0.55fr)]">
        <ControlTableShell
          title="Operator audit log"
          description="Recent admin actions and settings changes."
          density="compact"
          columns={[
            { id: "when", label: "When" },
            { id: "actor", label: "Actor" },
            { id: "action", label: "Action" },
            { id: "entity", label: "Entity" },
          ]}
          rowsCount={rows.length}
        >
          {rows.map((row) => {
            const active = row.id === selectedRow?.id;
            return (
              <tr
                key={row.id}
                data-row-key={row.id}
                className={`cursor-pointer transition ${active ? "bg-slate-100" : "hover:bg-[color:var(--surface-panel-muted)]"}`}
                onClick={() => setSelectedId(row.id)}
              >
                <td className="px-3 py-3 text-xs text-[color:var(--text-primary)]/82">
                  {row.created_at ? new Date(row.created_at).toLocaleString() : "Unknown"}
                </td>
                <td className="px-3 py-3 text-xs text-[color:var(--text-primary)]/82">{row.actor_email || row.actor_user_id || "System"}</td>
                <td className="px-3 py-3 text-xs font-medium text-[color:var(--text-primary)]">{row.action || "audit"}</td>
                <td className="px-3 py-3 text-xs text-[color:var(--text-primary)]/82">
                  {row.entity_type || "entity"}
                  {row.entity_id ? (
                    <span className="ml-2">
                      {row.entity_type === "report" ? (
                        <Link href={`/control/reports?reportId=${encodeURIComponent(row.entity_id)}`} className="text-[color:var(--brand)] underline">
                          {row.entity_id}
                        </Link>
                      ) : row.entity_type === "user" ? (
                        <Link href="/control/users" className="text-[color:var(--brand)] underline">
                          {row.entity_id}
                        </Link>
                      ) : row.entity_type === "organization" ? (
                        <Link href="/control/orgs" className="text-[color:var(--brand)] underline">
                          {row.entity_id}
                        </Link>
                      ) : (
                        <span className="text-[color:var(--text-primary)]/56">{row.entity_id}</span>
                      )}
                    </span>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </ControlTableShell>

        <ControlDetailPanel
          title={selectedRow?.action || "Audit detail"}
          eyebrow={selectedRow?.source === "settings" ? "settings audit" : "operator audit"}
          subtitle={selectedRow ? `${selectedRow.entity_type || "entity"} · ${selectedRow.entity_id || "unknown"}` : "Select a log row to inspect its trace details."}
          fields={selectedRow ? auditFields(selectedRow) : []}
          footer={
            <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4 text-sm text-[color:var(--text-primary)]/84">
              The audit surface is read-only. Use backend logs for traceability and add write actions only when the
              route exposes safe mutation endpoints.
            </div>
          }
        />
      </div>
    </div>
  );
}

function auditFields(row: AuditRow): ControlDetailField[] {
  return [
    { label: "Actor", value: row.actor_email || row.actor_user_id || "System" },
    { label: "Entity", value: row.entity_type || "Unknown" },
    { label: "Entity ID", value: row.entity_id || "Unknown" },
    { label: "Created", value: row.created_at ? new Date(row.created_at).toLocaleString() : "Unknown" },
    {
      label: "Before state",
      value: <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-[11px] leading-6 text-[color:var(--text-primary)]/84">{JSON.stringify(row.before_state || {}, null, 2)}</pre>,
    },
    {
      label: "After state",
      value: <pre className="max-h-44 overflow-auto whitespace-pre-wrap text-[11px] leading-6 text-[color:var(--text-primary)]/84">{JSON.stringify(row.after_state || {}, null, 2)}</pre>,
    },
  ];
}
