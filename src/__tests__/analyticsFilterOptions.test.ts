import { describe, expect, it } from "vitest";
import { getPortalAnalyticsFilterOptions } from "@/lib/analyticsFilterOptions";
import type { DashboardAnalyticsResponse } from "@/lib/services/reportService";

describe("getPortalAnalyticsFilterOptions", () => {
  it("uses unique facility/location ids ahead of repeated generic values", () => {
    const dashboard = {
      filters: {
        facilities: [
          {
            label: "SHAP",
            value: "inspection-trac-dev",
            facility_id: "facility-shap",
          },
          {
            label: "JNAP",
            value: "inspection-trac-dev",
            location_id: "facility-jnap",
          },
        ],
      },
    } as unknown as DashboardAnalyticsResponse;

    expect(getPortalAnalyticsFilterOptions(null, dashboard).facilities).toEqual([
      { label: "JNAP", value: "facility-jnap" },
      { label: "SHAP", value: "facility-shap" },
    ]);
  });
});
