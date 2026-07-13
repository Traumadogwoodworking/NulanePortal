import { describe, expect, it } from "vitest";

import type { PortalFilterFacets } from "@/features/portal-filters/model/facets";
import {
  validatePortalQueryFacetValues,
  type PortalDataQuery,
} from "@/features/portal-filters/query";

function facets(overrides: Partial<PortalFilterFacets> = {}): PortalFilterFacets {
  return {
    facilities: [{ value: "facility-1", label: "North Plant" }],
    yards: [{ value: "yard-1", label: "Main Yard" }],
    inspectionTypes: [{ value: "04", label: "Damage Inspection" }],
    inspectors: [{ value: "Inspector@Example.com", label: "Inspector One" }],
    statuses: [{ value: "Complete", label: "Complete" }],
    makes: [{ value: "Ford", label: "Ford" }],
    models: [{ value: "F-150", label: "F-150" }],
    severities: [{ value: "HIGH", label: "High" }],
    damageAreas: [{ value: "HOOD", label: "Hood" }],
    damageTypes: [{ value: "DENT", label: "Dent" }],
    ...overrides,
  };
}

describe("validatePortalQueryFacetValues", () => {
  it("accepts every supported canonical facet value", () => {
    const query: PortalDataQuery = {
      facilityId: "facility-1",
      yard: "yard-1",
      inspectionTypeNumber: "04",
      inspector: "inspector@example.com",
      status: "complete",
      make: "ford",
      model: "f-150",
      severity: "high",
      damageArea: "hood",
      damageType: "dent",
    };

    expect(validatePortalQueryFacetValues(query, facets())).toEqual({
      ok: true,
      issues: [],
    });
  });

  it("reports each missing facet-backed value with its query field and facet", () => {
    const query: PortalDataQuery = {
      facilityId: "missing-facility",
      yard: "missing-yard",
      inspectionTypeNumber: "4",
      inspector: "missing-inspector",
      status: "missing-status",
      make: "missing-make",
      model: "missing-model",
      severity: "missing-severity",
      damageArea: "missing-area",
      damageType: "missing-type",
    };

    const result = validatePortalQueryFacetValues(query, facets());

    expect(result.ok).toBe(false);
    expect(result.issues.map(({ field, facet, value }) => ({ field, facet, value }))).toEqual([
      { field: "facilityId", facet: "facilities", value: "missing-facility" },
      { field: "yard", facet: "yards", value: "missing-yard" },
      { field: "inspectionTypeNumber", facet: "inspectionTypes", value: "4" },
      { field: "inspector", facet: "inspectors", value: "missing-inspector" },
      { field: "status", facet: "statuses", value: "missing-status" },
      { field: "make", facet: "makes", value: "missing-make" },
      { field: "model", facet: "models", value: "missing-model" },
      { field: "severity", facet: "severities", value: "missing-severity" },
      { field: "damageArea", facet: "damageAreas", value: "missing-area" },
      { field: "damageType", facet: "damageTypes", value: "missing-type" },
    ]);
    expect(result.issues.every((issue) => issue.code === "unsupported_facet_value")).toBe(true);
  });

  it("requires exact facility, yard, and inspection-number values", () => {
    const result = validatePortalQueryFacetValues(
      {
        facilityId: "FACILITY-1",
        yard: "YARD-1",
        inspectionTypeNumber: "4",
      },
      facets(),
    );

    expect(result.issues.map((issue) => issue.field)).toEqual([
      "facilityId",
      "yard",
      "inspectionTypeNumber",
    ]);
  });

  it("does not accept presentation labels as canonical values", () => {
    const result = validatePortalQueryFacetValues(
      { facilityId: "North Plant", yard: "Main Yard", inspectionTypeNumber: "Damage Inspection" },
      facets(),
    );

    expect(result.issues.map((issue) => issue.field)).toEqual([
      "facilityId",
      "yard",
      "inspectionTypeNumber",
    ]);
  });

  it("treats a selected value as invalid when its authoritative facet is empty", () => {
    expect(
      validatePortalQueryFacetValues(
        { damageType: "dent" },
        facets({ damageTypes: [] }),
      ),
    ).toMatchObject({
      ok: false,
      issues: [{ field: "damageType", facet: "damageTypes", value: "dent" }],
    });
  });

  it("ignores fields that are not backed by facets", () => {
    expect(
      validatePortalQueryFacetValues(
        {
          dateFrom: "2026-07-01",
          dateTo: "2026-07-12",
          search: "free text",
          reportId: "report-1",
          vin: "1FTFW1E50JFA00001",
          moduleKey: "inspection_04",
          page: 2,
          pageSize: 50,
          sort: "created_at_desc",
        },
        facets({
          facilities: [],
          yards: [],
          inspectionTypes: [],
          inspectors: [],
          statuses: [],
          makes: [],
          models: [],
          severities: [],
          damageAreas: [],
          damageTypes: [],
        }),
      ),
    ).toEqual({ ok: true, issues: [] });
  });
});
