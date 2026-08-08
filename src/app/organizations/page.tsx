"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { usePortalSession } from "@/lib/portalSession";
import { usePortalDirectorySnapshot } from "@/lib/portalData";
import { Building2, RefreshCw, Shield, Users } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { ErrorPanel } from "@/components/ui/ErrorPanel";

export default function OrganizationsPage() {
  const [refreshMessage, setRefreshMessage] = useState<string | null>(null);
  const { session, organizationId } = usePortalSession();
  const {
    data: directory,
    mutate: refreshDirectory,
    isLoading,
    isRefreshing,
    lastUpdated,
    error,
  } = usePortalDirectorySnapshot();

  const currentOrganizationName = session?.organization?.name || "Not assigned";
  const facilityCount = directory?.facilities?.length ?? 0;
  const userCount = directory?.users?.length ?? 0;
  const refreshFailed = Boolean(refreshMessage && /unable|failed|error|could not/i.test(refreshMessage));

  const handleRefresh = async () => {
    setRefreshMessage(null);
    try {
      const refreshedDirectory = await refreshDirectory();
      if (refreshedDirectory?.partialError) {
        setRefreshMessage(`Organization summary refresh incomplete: ${refreshedDirectory.partialError}`);
      } else {
        setRefreshMessage("Organization summary refreshed from the server.");
      }
    } catch (refreshError) {
      setRefreshMessage(
        refreshError instanceof Error ? refreshError.message : "Organization summary refresh failed."
      );
    }
  };

  return (
    <div className="space-y-6">
        {error ? <ErrorPanel title="Organization summary refresh failed" error={error} /> : null}
        {directory?.partialError ? (
          <ErrorPanel title="Organization summary is incomplete" error={directory.partialError} />
        ) : null}
        {refreshMessage ? (
          <div
            role={refreshFailed ? "alert" : "status"}
            aria-live="polite"
            className={`rounded-xl border px-4 py-3 text-sm ${
              refreshFailed
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}
          >
            {refreshMessage}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3 text-sm text-slate-500" aria-live="polite">
          <span>
            {isRefreshing && directory ? "Checking the server for organization updates…" : "Organization summary is synced from the server."}
          </span>
          <div className="flex items-center gap-3">
            <span>{lastUpdated ? `Last updated ${new Date(lastUpdated).toLocaleTimeString()}` : "Not synced yet"}</span>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:cursor-wait disabled:opacity-70"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
              {isRefreshing ? "Refreshing…" : "Refresh"}
            </button>
          </div>
        </div>
        <Card className="overflow-hidden shadow-sm bg-slate-50">
          <CardHeader
            title={currentOrganizationName}
            subtitle={organizationId ? `ID: ${organizationId}` : ""}
          />
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <StatCard
                  label="Organizations"
                  value={isLoading && !directory ? "…" : 1}
                  icon={<Shield />}
                />
              </div>
              <div className="text-center">
                <StatCard
                  label="Facilities"
                  value={`${directory?.facilities?.filter((facility) => facility.active).length ?? 0}/${facilityCount}`}
                  icon={<Building2 />}
                />
              </div>
              <div className="text-center">
                <StatCard
                  label="Users"
                  value={`${directory?.users?.filter((user) => user.isActive).length ?? 0}/${userCount}`}
                  icon={<Users />}
                />
              </div>
            </div>
            </CardContent>
          </Card>

      </div>
  );
}
