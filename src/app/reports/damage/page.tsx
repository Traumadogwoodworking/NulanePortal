"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { ReportsManager } from "@/components/reports/ReportsManager";
import { ModuleNotice } from "@/components/ui/ModuleNotice";
import { usePortalSession } from "@/lib/portalSession";
import { isModuleEnabled } from "@/lib/modules";

export default function DamageReportsPage() {
  const moduleEnabled = isModuleEnabled("reports");
  const { organizationId } = usePortalSession();

  if (!moduleEnabled) {
    return (
      <ModuleNotice
        title="Reports disabled"
        description="Damage reports are not available in this environment."
        message="Enable NEXT_PUBLIC_MODULE_REPORTS to restore access."
      />
    );
  }

  if (!organizationId) {
    return (
      <EmptyState title="Organization context required" description="Damage reports are available once the session is tied to a tenant." />
    );
  }

  return <ReportsManager mode="damage" />;
}
