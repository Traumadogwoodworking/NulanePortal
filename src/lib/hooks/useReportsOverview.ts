"use client";

import { usePortalReports } from "@/lib/portalReports";

export function useReportsOverview() {
  const context = usePortalReports();
  if (!context) {
    throw new Error("useReportsOverview must be used within a PortalReportsProvider");
  }
  return {
    damageReports: context.damageReports,
    rsaReports: context.rsaReports,
    loading: context.loading,
    error: context.error?.message ?? null,
    refetch: context.refetch,
  };
}
