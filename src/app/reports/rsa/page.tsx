"use client";

import { usePortalSession } from "@/lib/portalSession";
import { EmptyState } from "@/components/ui/EmptyState";
import { RsaReportsManager } from "@/components/reports/RsaReportsManager";

function normalizeOrganizationName(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

export default function RsaReportsPage() {
  const { organizationId, session } = usePortalSession();
  const normalizedOrganizationName = normalizeOrganizationName(session?.organization?.name);
  const hasRsaAccess =
    organizationId === "org-awct" ||
    organizationId === "awct.inc" ||
    organizationId === "awc.inc" ||
    normalizedOrganizationName === "american wheel & car" ||
    normalizedOrganizationName === "awct.inc" ||
    normalizedOrganizationName === "awc.inc" ||
    normalizedOrganizationName === "inspection trac" ||
    normalizedOrganizationName === "inspection track" ||
    normalizedOrganizationName === "signature vehicle logistics";

  if (!organizationId) {
    return <EmptyState title="RSA scope missing" description="RSA reports are hidden until an organization session is active." />;
  }

  if (!hasRsaAccess) {
    return <EmptyState title="RSA reports unavailable" description="This organization does not have access to RSA reports." />;
  }

  return <RsaReportsManager />;
}
