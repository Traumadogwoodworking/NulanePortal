"use client";

import { usePortalSession } from "@/lib/portalSession";
import { getWorkspaceDisplayName, normalizePortalOrganizations } from "@/lib/workspaceSelection";

interface PortalTopBarProps {
  pageTitle: string;
  pageSubtitle?: string;
}

export function PortalTopBar({ pageTitle, pageSubtitle }: PortalTopBarProps) {
  const { organizationId, session, switchOrganization } = usePortalSession();
  const organizations = normalizePortalOrganizations(session?.organizations);

  return (
    <header className="portal-top-bar sticky top-0 z-50 min-h-[76px] w-full border-b border-slate-200 bg-white">
      <div className="flex min-h-[76px] w-full items-center justify-between gap-4 px-6 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="h-9 w-1 rounded-full bg-[#0d2c71]" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-[-0.02em] text-slate-950 sm:text-2xl">
              {pageTitle}
            </h1>
            {pageSubtitle ? (
              <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                {pageSubtitle}
              </p>
            ) : null}
          </div>
        </div>
        {organizations.length > 1 ? (
          <label className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-600">
            <span className="hidden sm:inline">Workspace</span>
            <select
              aria-label="Workspace"
              className="max-w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm"
              value={organizationId ?? ""}
              onChange={(event) => switchOrganization(event.target.value)}
            >
              {organizations.map((organization) => (
                <option key={organization.organization_id} value={organization.organization_id}>
                  {getWorkspaceDisplayName(organization)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </header>
  );
}
