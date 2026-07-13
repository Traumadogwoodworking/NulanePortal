import { describe, expect, it } from "vitest";
import {
  parsePortalFilterFacetsResponse,
  PortalFilterFacetsContractError,
} from "@/features/portal-filters/adapters/portalFilterFacets";
import { getPortalFilterFacetsKey } from "@/features/portal-filters/hooks/usePortalFilterFacets";

const generatedAt = "2026-07-12T18:45:00.000Z";

function completeFacets(overrides: Record<string, unknown> = {}) {
  return {
    facilities: [],
    yards: [],
    inspection_types: [],
    inspectors: [],
    statuses: [],
    makes: [],
    models: [],
    severities: [],
    damage_areas: [],
    damage_types: [],
    ...overrides,
  };
}

function responseWith(facets: Record<string, unknown>, meta: Record<string, unknown> = {}) {
  return {
    facets,
    meta: {
      source: "authorized_report_filter_facets",
      generated_at: generatedAt,
      ...meta,
    },
  };
}

describe("parsePortalFilterFacetsResponse", () => {
  it("normalizes every canonical facet and preserves backend values", () => {
    const parsed = parsePortalFilterFacetsResponse(responseWith(completeFacets({
      facilities: [
        { value: "facility-2", label: "South Plant", count: 4 },
        { value: "facility-1", label: "North Plant", count: 8 },
      ],
      yards: [{ value: "yard-uuid-1", label: "Main Yard", count: 6 }],
      inspection_types: [{ value: "04", label: "Damage Inspection", count: 5 }],
      inspectors: [{ value: "inspector@example.com", label: "Inspector One", count: 3 }],
      statuses: [{ value: "complete", label: "Complete", count: 7 }],
      makes: [{ value: "Ford", label: "Ford", count: 2 }],
      models: [{ value: "F-150", label: "F-150", count: 1 }],
      severities: [{ value: "5", label: ">12 inches", count: 2 }],
      damage_areas: [{ value: "27", label: "Hood", count: 2 }],
      damage_types: [{ value: "01", label: "Dent", count: 2 }],
    })));

    expect(parsed.facets.facilities.map((option) => option.value)).toEqual(["facility-1", "facility-2"]);
    expect(parsed.facets.yards).toEqual([{ value: "yard-uuid-1", label: "Main Yard", count: 6 }]);
    expect(parsed.facets.inspectionTypes[0]?.value).toBe("04");
    expect(parsed.facets.inspectors[0]?.value).toBe("inspector@example.com");
    expect(parsed.facets.statuses[0]?.value).toBe("complete");
    expect(parsed.facets.makes[0]?.value).toBe("Ford");
    expect(parsed.facets.models[0]?.value).toBe("F-150");
    expect(parsed.facets.severities[0]).toEqual({ value: "5", label: ">12 inches", count: 2 });
    expect(parsed.facets.damageAreas[0]).toEqual({ value: "27", label: "Hood", count: 2 });
    expect(parsed.facets.damageTypes[0]).toEqual({ value: "01", label: "Dent", count: 2 });
    expect(parsed.meta).toEqual({ source: "authorized_report_filter_facets", generatedAt });
  });

  it("keeps empty facet arrays and drops malformed options", () => {
    const parsed = parsePortalFilterFacetsResponse(responseWith(completeFacets({
      yards: [
        null,
        { value: "", label: "Missing value" },
        { value: "yard-1", label: "" },
        { value: "yard-2", label: "Negative", count: -1 },
        { value: "yard-3", label: "String count", count: "3" },
        { value: " yard-4 ", label: " Valid Yard ", count: 0 },
      ],
    })));

    expect(parsed.facets.yards).toEqual([{ value: "yard-4", label: "Valid Yard", count: 0 }]);
    expect(parsed.facets.facilities).toEqual([]);
    expect(parsed.facets.damageTypes).toEqual([]);
  });

  it("deduplicates case-insensitive text semantics and merges partitioned counts", () => {
    const parsed = parsePortalFilterFacetsResponse(responseWith(completeFacets({
      statuses: [
        { value: "complete", label: "Complete", count: 4 },
        { value: "complete", label: "Duplicate Complete", count: 9 },
        { value: "Complete", label: "Case-distinct backend value", count: 1 },
        { value: "pending", label: "Awaiting Review", count: 2 },
      ],
    })));

    expect(parsed.facets.statuses).toEqual([
      { value: "pending", label: "Awaiting Review", count: 2 },
      { value: "Complete", label: "Case-distinct backend value", count: 5 },
    ]);
  });

  it("does not case-fold canonical facility or yard IDs", () => {
    const parsed = parsePortalFilterFacetsResponse(responseWith(completeFacets({
      facilities: [
        { value: "LOC-A", label: "Location upper" },
        { value: "loc-a", label: "Location lower" },
      ],
      yards: [
        { value: "YARD-ID", label: "Yard upper" },
        { value: "yard-id", label: "Yard lower" },
      ],
    })));

    expect(parsed.facets.facilities).toHaveLength(2);
    expect(parsed.facets.yards).toHaveLength(2);
  });

  it("does not cross-populate facility and yard facets", () => {
    const parsed = parsePortalFilterFacetsResponse(responseWith(completeFacets({
      facilities: [{ value: "location-id", label: "JNAP" }],
      yards: [{ value: "organization-yard-id", label: "JNAP Default Yard" }],
    })));

    expect(parsed.facets.facilities[0]?.value).toBe("location-id");
    expect(parsed.facets.yards[0]?.value).toBe("organization-yard-id");
  });

  it("accepts canonical camel-case wire keys and metadata", () => {
    const parsed = parsePortalFilterFacetsResponse({
      facets: completeFacets({
        inspectionTypes: [{ value: "04", label: "Inspection 04" }],
        damageAreas: [{ value: "hood", label: "Hood" }],
        damageTypes: [{ value: "dent", label: "Dent" }],
      }),
      meta: { source: "reports_filter_options", generatedAt },
    });

    expect(parsed.facets.inspectionTypes[0]?.value).toBe("04");
    expect(parsed.meta.generatedAt).toBe(generatedAt);
  });

  it("rejects noncanonical fallback payloads and invalid metadata", () => {
    expect(() => parsePortalFilterFacetsResponse({ filter_options: completeFacets() })).toThrow(
      PortalFilterFacetsContractError,
    );
    expect(() => parsePortalFilterFacetsResponse(responseWith(completeFacets(), { source: "" }))).toThrow(
      /meta.source/,
    );
    expect(() => parsePortalFilterFacetsResponse(responseWith(completeFacets(), { generated_at: "not-a-date" }))).toThrow(
      /meta.generatedAt/,
    );
    expect(() => parsePortalFilterFacetsResponse(responseWith({ ...completeFacets(), yards: null }))).toThrow(
      /yards must be an array/,
    );
  });
});

describe("getPortalFilterFacetsKey", () => {
  it("keys facet requests by user and organization", () => {
    expect(getPortalFilterFacetsKey(" user-1 ", " org-1 ")).toEqual([
      "portal/filter-facets",
      "user-1",
      "org-1",
      "v1",
    ]);
    expect(getPortalFilterFacetsKey("", "org-1")).toBeNull();
    expect(getPortalFilterFacetsKey("user-1", null)).toBeNull();
  });
});
