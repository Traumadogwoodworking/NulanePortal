"use client";

import { usePortalSession } from "@/lib/portalSession";
import { EmptyState } from "@/components/ui/EmptyState";
import { RsaReportsManager } from "@/components/reports/RsaReportsManager";

export default function RsaReportsPage() {
  const { organizationId } = usePortalSession();

  if (!organizationId) {
    return <EmptyState title="RSA scope missing" description="RSA reports are hidden until an organization session is active." />;
  }

  return <RsaReportsManager />;
}
