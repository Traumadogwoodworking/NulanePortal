import { describe, expect, it } from "vitest";
import {
  DEFAULT_DAMAGE_REPORT_FILTERS,
  matchesDamageReportFilters,
  type DamageReportFilters,
} from "@/lib/reportFilters";
import type { ReportDamageApiRow } from "@/lib/types";

function filters(overrides: Partial<DamageReportFilters>): DamageReportFilters {
  return { ...DEFAULT_DAMAGE_REPORT_FILTERS, ...overrides };
}

describe("matchesDamageReportFilters", () => {
  const report: ReportDamageApiRow = {
    report_id: "report-1",
    yard: "JNAP Main Yard",
    yard_id: "yard-uuid-1",
    damage_entries: [
      {
        severity: "LOW",
        damage_area: "Left front door",
        damage_area_code: "LFD",
        damage_type: "Scratch",
        damage_type_code: "SCR",
      },
      {
        severity: "HIGH",
        damage_area: "Right rear quarter",
        damage_area_code: "RRQ",
        damage_type: "Dent",
        damage_type_code: "DNT",
      },
    ],
  };

  it("matches either a yard label or its canonical yard ID", () => {
    expect(matchesDamageReportFilters(report, filters({ yardFilter: "JNAP Main Yard" }))).toBe(true);
    expect(matchesDamageReportFilters(report, filters({ yardFilter: "yard-uuid-1" }))).toBe(true);
    expect(matchesDamageReportFilters(report, filters({ yardFilter: "yard-uuid-2" }))).toBe(false);
  });

  it("matches canonical yard IDs found in nested wire payloads even when a label is present", () => {
    const nestedReport = {
      report_id: "report-2",
      yard_label: "Drop Zone",
      payload: { yard_id: "yard-drop-zone" },
    } as ReportDamageApiRow;

    expect(matchesDamageReportFilters(nestedReport, filters({ yardFilter: "yard-drop-zone" }))).toBe(true);
  });

  it("matches canonical damage codes and severity from any damage entry", () => {
    expect(matchesDamageReportFilters(report, filters({ damageAreaFilter: "RRQ" }))).toBe(true);
    expect(matchesDamageReportFilters(report, filters({ damageTypeFilter: "DNT" }))).toBe(true);
    expect(matchesDamageReportFilters(report, filters({ severityFilter: "HIGH" }))).toBe(true);
  });
});
