"use client";

import { useMemo, useState } from "react";
import { RefreshCw, SlidersHorizontal } from "lucide-react";
import { usePortalSession } from "@/lib/portalSession";
import { type ControlSettingRecord } from "@/lib/services/controlPlaneService";
import { useControlPlaneBootstrap } from "@/lib/portalData";
import { ControlMetricTile } from "@/components/control/ControlMetricTile";
import { ControlSection } from "@/components/control/ControlSection";
import { ControlTableShell } from "@/components/control/ControlTableShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

interface SettingGroup {
  title: string;
  description: string;
  keys: string[];
  editable: boolean;
}

interface SettingGroupView extends SettingGroup {
  rows: ControlSettingRecord[];
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    title: "Delivery control",
    description: "Email delivery, portal mode, and backend target selection are the highest-value operational knobs.",
    keys: ["maintenance_mode", "active_portal_backend_target", "active_reports_source", "portal_read_mode"],
    editable: false,
  },
  {
    title: "Feature flags",
    description: "Feature availability can be scoped globally or to a tenant/facility if the backend has values stored.",
    keys: ["feature.docufit_enabled", "feature.damage_actions_enabled"],
    editable: false,
  },
  {
    title: "Layout defaults",
    description: "Operator/admin defaults for the control surface and company admin dashboard.",
    keys: ["layout.company_admin.dashboard", "active_powerbi_workspace_profile"],
    editable: false,
  },
];

function safeString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") return JSON.stringify(value);
  return "";
}

function valueTone(value: string): "positive" | "warning" | "neutral" {
  if (!value || value === "not set") return "warning";
  return "neutral";
}

function formatScope(row: ControlSettingRecord): string {
  const scopeType = row.scope_type || "global";
  return row.scope_id ? `${scopeType} · ${row.scope_id}` : scopeType;
}

function formatValue(row: ControlSettingRecord): string {
  const rendered = safeString(row.value);
  if (!rendered) {
    return "not set";
  }
  return rendered;
}

function settingPriority(row: ControlSettingRecord): number {
  const key = row.key || "";
  if (key === "maintenance_mode") return 0;
  if (key.startsWith("feature.")) return 1;
  if (key.startsWith("active_")) return 2;
  return 3;
}

export default function ControlSettingsPage() {
  const { organizationId, user } = usePortalSession();
  const { data: bootstrap, error, isLoading, refresh } = useControlPlaneBootstrap();
  const [search, setSearch] = useState("");
  const settingsRows = (bootstrap?.pdfConfig as { settings?: ControlSettingRecord[] } | undefined)?.settings || [
    ...(bootstrap?.emailRules || []),
    ...(bootstrap?.reportRules || []),
  ];
  const allowedKeys = Array.isArray((bootstrap?.pdfConfig as { allowedKeys?: string[] } | undefined)?.allowedKeys)
    ? ((bootstrap?.pdfConfig as { allowedKeys?: string[] } | undefined)?.allowedKeys || [])
    : [];

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...settingsRows].sort((left, right) => settingPriority(left) - settingPriority(right) || (left.key || "").localeCompare(right.key || ""));
    if (!q) return sorted;
    return sorted.filter((row) => {
      return [row.key, row.scope_type, row.scope_id, safeString(row.value)]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [search, settingsRows]);

  const groupedRows = useMemo<SettingGroupView[]>(() => {
    return SETTING_GROUPS.map((group): SettingGroupView => ({
      ...group,
      rows: filteredRows.filter((row) => group.keys.includes(row.key || "")),
    }));
  }, [filteredRows]);

  const ungroupedRows = filteredRows.filter((row) => !SETTING_GROUPS.some((group) => group.keys.includes(row.key || "")));

  if (!organizationId) {
    return <div className="rounded-[1.75rem] border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] p-6 text-[color:var(--metric-warning-fg)]">Settings surface requires an organization session.</div>;
  }

  if (isLoading) {
    return <div className="rounded-[1.75rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] p-6 text-[color:var(--text-secondary)]">Loading settings...</div>;
  }

  if (error) {
    return <div className="rounded-[1.75rem] border border-[color:var(--metric-danger-border)] bg-[color:var(--metric-danger-bg)] p-6 text-[color:var(--metric-danger-fg)]">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label="Admin inspection only" tone="warning" />
          <StatusBadge label="Read only" tone="neutral" />
        </div>
        <p className="mt-2 text-sm text-[color:var(--text-secondary)]">
          Feature flags, backend targets, templates, email lists, and visibility rows are surfaced here for inspection only. No supported write controls are exposed on this page.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ControlMetricTile label="Settings rows" value={settingsRows.length} detail="Persisted backend values" icon={<SlidersHorizontal className="h-4 w-4" />} />
        <ControlMetricTile label="Allowed keys" value={allowedKeys.length} detail="Backend registry entries" tone="neutral" />
        <ControlMetricTile label="Unconfigured" value={settingsRows.filter((row) => !safeString(row.value)).length} detail="Rows with no value yet" tone="warning" />
        <ControlMetricTile label="Operator" value={user?.display_name || user?.email || "Unknown"} detail="Current session" tone="neutral" />
      </div>

      <ControlSection
        title="Settings control surface"
        description="Admin-control inspection only. It groups live backend values, shows scope/source truth, and calls out unconfigured states honestly."
        actions={
          <button
            type="button"
            onClick={() => {
              setSearch("");
              void refresh();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[color:var(--text-primary)] transition hover:border-[color:var(--border-strong)]"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {groupedRows.map((group) => (
            <div key={group.title} className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-muted)]">{group.title}</p>
              <p className="mt-2 text-sm leading-6 text-[color:var(--text-secondary)]">{group.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
              <StatusBadge label={group.editable ? "Editable" : "Read only"} tone={group.editable ? "positive" : "warning"} />
              <StatusBadge label="Backend-sourced" tone="neutral" />
              <StatusBadge label={`${group.rows?.length || 0} rows`} tone="neutral" />
            </div>
          </div>
          ))}
        </div>
      </ControlSection>

      <ControlSection title="Search and scope" description="Filter the live settings snapshot by key, scope, or value.">
        <div className="flex flex-col gap-3 rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.36em] text-[color:var(--text-muted)]">Search</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Key, scope, value, or org"
              className="mt-2 w-full rounded-2xl border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] px-4 py-3 text-sm text-[color:var(--text-primary)] placeholder:text-[color:var(--text-muted)] outline-none"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <StatusBadge label={`${filteredRows.length} visible`} tone="neutral" />
            <StatusBadge label={`${allowedKeys.length} allowed keys`} tone="neutral" />
          </div>
        </div>
      </ControlSection>

      {groupedRows.map((group) => (
        <ControlSection key={group.title} title={group.title} description={group.description}>
          <ControlTableShell
            density="compact"
            columns={[
              { id: "key", label: "Key" },
              { id: "scope", label: "Scope" },
              { id: "value", label: "Value" },
              { id: "updated", label: "Updated" },
            ]}
            rowsCount={group.rows.length}
            emptyState={<EmptyState title="No settings in this group" description="The backend currently has no stored rows for this slice." />}
          >
            {group.rows.map((row, index) => (
              <tr key={`${row.key || "setting"}-${row.scope_id || "global"}-${index}`} className="border-b border-[color:var(--border-subtle)] hover:bg-[color:var(--surface-panel-muted)]">
                <td className="px-3 py-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-[color:var(--text-primary)]">{row.key || "Unknown"}</p>
                    <p className="text-xs text-[color:var(--text-secondary)]">{SETTING_GROUPS.some((settingGroup) => settingGroup.keys.includes(row.key || "")) ? "Backend governed, read only" : "Uncategorized"}</p>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{formatScope(row)}</td>
                <td className="px-3 py-3">
                  <div className="space-y-1">
                    <StatusBadge label={formatValue(row)} tone={valueTone(formatValue(row))} />
                    <p className="text-xs text-[color:var(--text-secondary)]">
                      {row.value === null || row.value === undefined || row.value === "" ? "Not configured yet" : "Persisted backend value"}
                    </p>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{row.updated_at ? new Date(row.updated_at).toLocaleString() : "Unknown"}</td>
              </tr>
            ))}
          </ControlTableShell>
        </ControlSection>
      ))}

      <ControlSection title="Remaining values" description="Settings that were returned by the backend but are not yet grouped above.">
        <ControlTableShell
          density="compact"
          columns={[
            { id: "key", label: "Key" },
            { id: "scope", label: "Scope" },
            { id: "value", label: "Value" },
            { id: "updated", label: "Updated" },
          ]}
          rowsCount={ungroupedRows.length}
          emptyState={<EmptyState title="No remaining settings" description="Everything from the live settings snapshot is grouped above." />}
        >
          {ungroupedRows.map((row, index) => (
            <tr key={`${row.key || "setting"}-${index}`} className="border-b border-[color:var(--border-subtle)] hover:bg-[color:var(--surface-panel-muted)]">
              <td className="px-3 py-3 text-sm text-[color:var(--text-primary)]">{row.key || "Unknown"}</td>
              <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{formatScope(row)}</td>
              <td className="px-3 py-3 text-sm text-[color:var(--text-primary)]">{formatValue(row)}</td>
              <td className="px-3 py-3 text-sm text-[color:var(--text-secondary)]">{row.updated_at ? new Date(row.updated_at).toLocaleString() : "Unknown"}</td>
            </tr>
          ))}
        </ControlTableShell>
      </ControlSection>

    </div>
  );
}
