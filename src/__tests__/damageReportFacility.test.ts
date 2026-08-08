import { describe, expect, it } from "vitest";
import {
  enrichDamageReportFacility,
  resolveDamageReportLocationName,
} from "@/lib/reportUtils";
import type { PortalSessionLocation, ReportDamageApiRow } from "@/lib/types";

const locations: PortalSessionLocation[] = [
  {
    location_id: "facility-123",
    location_name: "Detroit Vehicle Center",
    location_label: "DVC",
  },
];

describe("damage report facility enrichment", () => {
  it("joins an identifier-only report to the authenticated facility directory", () => {
    const report: ReportDamageApiRow = {
      report_id: "report-1",
      facility_id: "facility-123",
    };

    const enriched = enrichDamageReportFacility(report, locations);

    expect(resolveDamageReportLocationName(enriched)).toBe("DVC");
    expect(enriched.location_id).toBe("facility-123");
    expect(enriched.location?.location_label).toBe("DVC");
  });

  it("preserves a valid report facility label", () => {
    const report: ReportDamageApiRow = {
      report_id: "report-2",
      facility_id: "facility-123",
      facility: "Customer-provided facility",
    };

    const enriched = enrichDamageReportFacility(report, locations);

    expect(enriched).toBe(report);
    expect(resolveDamageReportLocationName(enriched)).toBe("Customer-provided facility");
  });
});
