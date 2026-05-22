"use client";

import { useEffect, useState } from "react";
import { DatabaseBackup, HardDrive, History, FileWarning, RotateCcw, AlertTriangle } from "lucide-react";
import { usePortalSession } from "@/lib/portalSession";
import { 
  fetchBackupHealth, 
  fetchBackupHistory,
  type ControlBackupHealth,
  type ControlBackupHistory
} from "@/lib/services/controlPlaneService";
import { ControlSection } from "@/components/control/ControlSection";
import { ControlMetricTile } from "@/components/control/ControlMetricTile";
import { DataTableShell } from "@/components/ui/DataTableShell";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ControlBackupPage() {
  const { organizationId } = usePortalSession();
  
  const [health, setHealth] = useState<ControlBackupHealth | null>(null);
  const [history, setHistory] = useState<ControlBackupHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    void (async () => {
      try {
        const [healthData, historyData] = await Promise.all([
          fetchBackupHealth(),
          fetchBackupHistory()
        ]);
        
        if (!active) return;
        setHealth(healthData);
        setHistory(historyData);
        
        // Mock missing endpoints if null comes back
        if (!healthData && !historyData.length) {
          setError("Backend backup contracts (/admin/control-plane/backup-health and backup-history) are not implemented. Visuals below may be empty or simulated.");
        }

      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Unable to load backup data.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [organizationId]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)]" />
          ))}
        </div>
        <div className="h-72 rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)]" />
      </div>
    );
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-5">
      {error && (
        <div className="flex gap-4 rounded-[1.5rem] border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] p-5 text-[color:var(--metric-warning-fg)]">
          <AlertTriangle className="h-6 w-6 shrink-0 text-amber-500" />
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.36em] text-[color:var(--text-primary)]">Backup data unavailable</p>
            <p className="mt-2 text-sm leading-6 text-[color:var(--text-primary)]/84">{error}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        <ControlMetricTile
          label="Status"
          value={health?.status || "Unknown"}
          detail="Overall backup health"
          tone={health?.status === "healthy" ? "positive" : "neutral"}
          icon={<DatabaseBackup className="h-4 w-4" />}
        />
        <ControlMetricTile
          label="Total Storage"
          value={health ? `${health.total_storage_mb} MB` : "0 MB"}
          detail="Total retained volume"
          icon={<HardDrive className="h-4 w-4" />}
        />
        <ControlMetricTile
          label="Active Policies"
          value={health?.active_policies || 0}
          detail="Configured schedules"
          icon={<History className="h-4 w-4" />}
        />
        <ControlMetricTile
          label="Last Successful"
          value={health?.last_successful_backup ? new Date(health.last_successful_backup).toLocaleTimeString() : "Never"}
          detail={health?.last_successful_backup ? new Date(health.last_successful_backup).toLocaleDateString() : "-"}
          tone={health?.last_successful_backup ? "positive" : "warning"}
          icon={<RotateCcw className="h-4 w-4" />}
        />
      </div>

      <ControlSection
        title="Backup History"
        description="Historical log of snapshot operations on the control-plane."
        actions={
          <button disabled className="inline-flex items-center gap-2 rounded-full border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-2 text-sm font-semibold text-[color:var(--text-primary)]/68 cursor-not-allowed">
            <DatabaseBackup className="w-4 h-4" /> Trigger Snapshot
          </button>
        }
      >
        {history.length ? (
          <div className="overflow-hidden rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)]">
            <DataTableShell
              columns={[
                { id: "id", label: "Snapshot ID" },
                { id: "type", label: "Type" },
                { id: "status", label: "Status" },
                { id: "started_at", label: "Started" },
                { id: "size", label: "Size" },
              ]}
              rowsCount={history.length}
            >
              {history.map((record) => (
                <tr key={record.id} className="border-b border-[color:var(--border-subtle)] hover:bg-[color:var(--surface-panel-muted)] transition-colors">
                  <td className="px-4 py-4 text-sm font-mono text-[color:var(--text-primary)]">{record.id}</td>
                  <td className="px-4 py-4 text-sm text-[color:var(--text-primary)]/84 capitalize">{record.type}</td>
                  <td className="px-4 py-4">
                    <StatusBadge 
                      label={record.status} 
                      tone={record.status === "completed" ? "positive" : record.status === "failed" ? "danger" : "neutral"} 
                    />
                  </td>
                  <td className="px-4 py-4 text-sm text-[color:var(--text-primary)]/72">
                    {new Date(record.started_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-4 text-sm font-mono text-[color:var(--text-primary)]/84">
                    {formatBytes(record.size_bytes)}
                  </td>
                </tr>
              ))}
            </DataTableShell>
          </div>
        ) : (
          <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-8">
            <EmptyState
              title="No backup records visible"
              description="The control-plane returned no history for the current scope."
              icon={<FileWarning className="mb-4 h-10 w-10 text-[color:var(--text-primary)]/20" />}
            />
          </div>
        )}
      </ControlSection>

      <ControlSection
        title="Restore & Preflight Activity"
        description="Records of restoration operations and preflight test verifications."
      >
        <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-8">
          <EmptyState
            title="No activity recorded"
            description="There are no recent restore or proof executions for this system."
            icon={<RotateCcw className="mb-4 h-10 w-10 text-[color:var(--text-primary)]/20" />}
          />
        </div>
      </ControlSection>
    </div>
  );
}
