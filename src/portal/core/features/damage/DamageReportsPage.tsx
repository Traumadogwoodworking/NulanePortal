"use client";

import { Suspense } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ModuleNotice } from "@/components/ui/ModuleNotice";
import { isModuleEnabled } from "@/lib/modules";
import { usePortalSession } from "@/lib/portalSession";
import { PageLoadingScreen } from "@/portal/core/ui/PageLoadingScreen";
import { ReportsManager } from "@/portal/core/features/damage/ReportsManager";

export function DamageReportsPage() {
  const moduleEnabled = isModuleEnabled("reports");
  const { organizationId, status } = usePortalSession();

  if (!moduleEnabled) {
    return (
      <ModuleNotice
        title="Reports disabled"
        description="Damage reports are not available in this environment."
        message="Enable NEXT_PUBLIC_MODULE_REPORTS to restore access."
      />
    );
  }

  if (status === "loading" || status === "authenticating") {
    return (
      <PageLoadingScreen
        title="Loading damage reports"
        description="Confirming your portal session..."
        detail="The report workspace will appear as soon as your organization is ready."
      />
    );
  }

  if (!organizationId) {
    return (
      <EmptyState
        title="Organization context required"
        description="Damage reports are available once the session is tied to a tenant."
      />
    );
  }

  return (
    <Suspense
      fallback={
        <PageLoadingScreen
          title="Opening damage report"
          description="Loading the requested report..."
          detail="The report details will appear as soon as they are available."
        />
      }
    >
      <ReportsManager mode="damage" />
    </Suspense>
  );
}
