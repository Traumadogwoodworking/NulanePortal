import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAMAGE_REPORT_FILTERS,
  matchesDamageReportFilters,
  normalizeDamageReportFilters,
} from "@/lib/reportFilters";
import type { ReportDamageApiRow } from "@/lib/types";

const report = {
  report_id: "report-17",
  vin: "1TESTVIN",
  make: "Toyota",
  model: "Camry",
  status: "VERIFIED",
  inspection_type_number: "02",
  location_id: "location-4",
  location_label: "SHAP",
  yard_id: "yard-9",
  yard_name: "Dropzone",
  inspector_email: "inspector@example.com",
  created_at: "2026-07-21T12:00:00.000Z",
} as unknown as ReportDamageApiRow;

describe("damage report filters", () => {
  it("matches canonical location, yard, and zero-padded inspection fields on raw list rows", () => {
    for (const [label, partial] of [
      ["facility", { facilityFilter: "location-4" }],
      ["yard", { yardFilter: "yard-9" }],
      ["inspection", { inspectionTypeFilter: "02" }],
      ["status", { statusFilter: "verified" as const }],
    ] as const) {
      expect(matchesDamageReportFilters(report, normalizeDamageReportFilters({ ...DEFAULT_DAMAGE_REPORT_FILTERS, ...partial })), label).toBe(true);
    }
    const filters = normalizeDamageReportFilters({
      ...DEFAULT_DAMAGE_REPORT_FILTERS,
      facilityFilter: "location-4",
      yardFilter: "yard-9",
      inspectionTypeFilter: "02",
      statusFilter: "verified",
    });

    expect(matchesDamageReportFilters(report, filters)).toBe(true);
  });

  it("rejects a different inspection type", () => {
    const filters = normalizeDamageReportFilters({
      ...DEFAULT_DAMAGE_REPORT_FILTERS,
      inspectionTypeFilter: "03",
    });

    expect(matchesDamageReportFilters(report, filters)).toBe(false);
  });
});
