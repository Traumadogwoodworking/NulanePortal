"use client";

import { useMemo } from "react";
import { Building2, Users as UsersIcon, Link2, BarChart3, ArrowUpRight } from "lucide-react";
import { usePortalSession } from "@/lib/portalSession";
import { ControlSection } from "@/components/control/ControlSection";
import { ControlMetricTile } from "@/components/control/ControlMetricTile";
import { DataTableShell } from "@/components/ui/DataTableShell";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { PortalStatusScreen } from "@/components/PortalStatusScreen";
import { useControlPlaneBootstrap, usePortalBrandingSnapshot } from "@/lib/portalData";

type OrganizationRow = {
  id: string;
  name: string;
  users?: number | string;
  facilities?: number | string;
  flags?: number | string;
  status?: string;
};

export default function OrgsPage() {
  const { session, isSuperAdmin, switchOrganization } = usePortalSession();
  const { data: bootstrap, error, isLoading } = useControlPlaneBootstrap();
  const { data: branding } = usePortalBrandingSnapshot();
  const orgs = Array.isArray(bootstrap?.organizations)
    ? bootstrap.organizations.map((organization) => ({
        id: String(organization.organization_id || ""),
        name: String(organization.name || "Unknown organization"),
        users: 0,
        facilities: 0,
        flags: 0,
        status: "healthy",
      }))
    : [];

  const totals = useMemo(() => ({
    users: orgs.reduce((acc, org) => acc + Number(org.users || 0), 0),
    facilities: orgs.reduce((acc, org) => acc + Number(org.facilities || 0), 0),
    flags: orgs.reduce((acc, org) => acc + Number(org.flags || 0), 0),
  }), [orgs]);

  if (!isSuperAdmin && !isLoading) {
    return <PortalStatusScreen title="Super-Admin Only" description="Tenant administration requires global administrative privileges." />;
  }

  if (isLoading) {
    return <div className="space-y-4"><div className="h-32 rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)]" /><div className="h-72 rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)]" /></div>;
  }

  return (
    <div className="space-y-6">
      {error ? <div className="rounded-[1.5rem] border border-[color:var(--metric-warning-border)] bg-[color:var(--metric-warning-bg)] px-4 py-3 text-sm text-[color:var(--metric-warning-fg)]">{error instanceof Error ? error.message : "Failed to communicate with control plane."}</div> : null}
      <ControlSection title="Current org context" description="The live session branding snapshot stays visible while switching tenants.">
        <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4 text-sm text-[color:var(--text-primary)]/84">
          <p className="font-semibold text-[color:var(--text-primary)]">{branding?.organization_name || session?.organization?.name || "Unknown organization"}</p>
          <p className="mt-1 text-xs text-[color:var(--text-primary)]/68">{session?.organization?.organization_id || "No session org id"}</p>
        </div>
      </ControlSection>

      <div className="grid gap-4 md:grid-cols-4">
        <ControlMetricTile label="Total Tenants" value={orgs.length} detail="Managed organizations" icon={<Building2 className="w-4 h-4" />} />
        <ControlMetricTile label="Active Users" value={totals.users} detail="Across all tenants" icon={<UsersIcon className="w-4 h-4" />} />
        <ControlMetricTile label="Aggregate Facilities" value={totals.facilities} detail="Active connected yards" icon={<Link2 className="w-4 h-4" />} />
        <ControlMetricTile label="Flagged Payload" value={totals.flags} detail="Awaiting review" tone="warning" icon={<BarChart3 className="w-4 h-4" />} />
      </div>

      <ControlSection title="Global admin scope" description="This surface is reserved for super_admin identities and shows the global tenant inventory.">
        <div className="rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] p-4 text-sm text-[color:var(--text-primary)]/84">
          Global organization management only. Org admins remain scoped to their own tenant surfaces.
        </div>
      </ControlSection>

      <ControlSection title="Provisioned Organizations" description="Root tenants and isolated bounds currently active in the ecosystem.">
        {orgs.length ? (
          <div className="overflow-hidden rounded-[1.35rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)]">
            <DataTableShell columns={[{ id: "name", label: "Organization Name" }, { id: "tenant", label: "Tenant ID" }, { id: "users", label: "Users" }, { id: "status", label: "Health" }, { id: "actions", label: "" }]} rowsCount={orgs.length}>
              {orgs.map((org) => (
                <tr key={org.id} className="border-b border-[color:var(--border-subtle)] hover:bg-[color:var(--surface-panel-muted)] transition-colors">
                  <td className="px-4 py-4 text-sm font-medium text-[color:var(--text-primary)]">{org.name}</td>
                  <td className="px-4 py-4 text-sm font-mono text-[color:var(--text-primary)]/82">{org.id}</td>
                  <td className="px-4 py-4 text-sm text-[color:var(--text-primary)]/82">{org.users} seated</td>
                  <td className="px-4 py-4"><StatusBadge label={org.status || "unknown"} tone={org.status === "healthy" ? "positive" : "warning"} /></td>
                  <td className="px-4 py-4 text-right">
                    <button className="p-2 text-[color:var(--text-primary)]/72 hover:text-[color:var(--text-primary)]" title="Inspect Tenant Data" onClick={() => switchOrganization(org.id, org.name)}>
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </DataTableShell>
          </div>
        ) : (
          <EmptyState title="No organizations returned" description="The backend organization list is empty for this scope." />
        )}
      </ControlSection>
    </div>
  );
}
