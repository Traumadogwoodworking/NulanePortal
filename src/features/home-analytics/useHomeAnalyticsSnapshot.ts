import { useDashboardAnalyticsSnapshot } from "@/lib/portalData";
import type { DashboardAnalyticsParams } from "@/lib/services/reportService";

export function useHomeAnalyticsSnapshot(params: DashboardAnalyticsParams = {}) {
  return useDashboardAnalyticsSnapshot(params);
}
