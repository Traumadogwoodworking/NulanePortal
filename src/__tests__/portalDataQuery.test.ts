import { describe, expect, it } from "vitest";

import {
  PortalDataQueryValidationError,
  adaptPortalQueryForDashboardAnalytics,
  adaptPortalQueryForFilterFacets,
  adaptPortalQueryForHomeSnapshot,
  adaptPortalQueryForReportList,
  normalizePortalDataQuery,
  parsePortalDataQuery,
  resetPortalDataQuery,
  serializePortalDataQuery,
  stringifyPortalDataQuery,
  type PortalDataQuery,
} from "@/features/portal-filters/query";

const EVERY_FIELD: PortalDataQuery = {
  dateFrom: "2026-07-01",
  dateTo: "2026-07-12",
  facilityId: "facility-123",
  yard: "Yard C",
  inspectionTypeNumber: "04",
  inspector: "inspector@example.com",
  status: "completed",
  make: "Ford",
  model: "F-150",
  severity: "HIGH",
  damageArea: "Left rear",
  damageType: "Dent & scratch",
  search: "VIN + report/42",
  page: 2,
  pageSize: 50,
  sort: "created_at_desc",
  reportId: "report-42",
  vin: "1FTFW1E50PFA00001",
  moduleKey: "inspection_04",
};

describe("canonical portal query normalization", () => {
  it("omits empty values and the All sentinel while trimming backend values", () => {
    expect(
      normalizePortalDataQuery({
        facilityId: "  all ",
        yard: "   ",
        status: " ALL ",
        make: " Ford ",
      })
    ).toEqual({ ok: true, query: { make: "Ford" }, issues: [] });
  });

  it("preserves inspection type leading zeroes", () => {
    expect(normalizePortalDataQuery({ inspectionTypeNumber: " 04 " }).query).toEqual({
      inspectionTypeNumber: "04",
    });
  });

  it("keeps facility IDs distinct from yard values", () => {
    expect(
      normalizePortalDataQuery({ facilityId: "location-id-7", yard: "Yard 7" }).query
    ).toEqual({ facilityId: "location-id-7", yard: "Yard 7" });
  });

  it("rejects invalid calendar dates and paging rather than coercing them", () => {
    const result = normalizePortalDataQuery({
      dateFrom: "2026-02-29",
      dateTo: "07/12/2026",
      page: 0,
      pageSize: 12.5,
    });

    expect(result.ok).toBe(false);
    expect(result.query).toEqual({});
    expect(result.issues.map(({ code, field }) => [code, field])).toEqual([
      ["invalid_date", "dateFrom"],
      ["invalid_date", "dateTo"],
      ["invalid_positive_integer", "page"],
      ["invalid_positive_integer", "pageSize"],
    ]);
  });

  it("rejects an inverted date range without swapping it", () => {
    const result = normalizePortalDataQuery({
      dateFrom: "2026-07-12",
      dateTo: "2026-07-01",
    });
    expect(result.ok).toBe(false);
    expect(result.query).toEqual({});
    expect(result.issues[0]?.code).toBe("invalid_date_range");
  });
});

describe("portal query URL contract", () => {
  it("serializes an empty or reset query without All markers", () => {
    expect(stringifyPortalDataQuery({})).toBe("");
    expect(stringifyPortalDataQuery(resetPortalDataQuery())).toBe("");
  });

  it("serializes every supported field in one deterministic order", () => {
    expect(stringifyPortalDataQuery(EVERY_FIELD)).toBe(
      "from=2026-07-01&to=2026-07-12&facility=facility-123&yard=Yard+C&inspection_type=04&inspector=inspector%40example.com&status=completed&make=Ford&model=F-150&severity=HIGH&damage_area=Left+rear&damage_type=Dent+%26+scratch&q=VIN+%2B+report%2F42&page=2&page_size=50&sort=created_at_desc&report_id=report-42&vin=1FTFW1E50PFA00001&module_key=inspection_04"
    );
  });

  it("keeps serialization order stable regardless of input object order", () => {
    const first = stringifyPortalDataQuery({
      yard: "Yard C",
      dateFrom: "2026-07-01",
      status: "completed",
    });
    const second = stringifyPortalDataQuery({
      status: "completed",
      dateFrom: "2026-07-01",
      yard: "Yard C",
    });
    expect(first).toBe("from=2026-07-01&yard=Yard+C&status=completed");
    expect(second).toBe(first);
  });

  it("encodes and decodes special characters without changing the value", () => {
    const query = {
      yard: "Yard A/B & C",
      inspector: "last+portal@example.com",
      search: "VIN #42?",
    };
    const serialized = stringifyPortalDataQuery(query);
    expect(serialized).toContain("yard=Yard+A%2FB+%26+C");
    expect(parsePortalDataQuery(serialized)).toEqual({
      ok: true,
      query,
      issues: [],
    });
  });

  it("round trips every field and preserves inspection type 04 as a string", () => {
    const serialized = serializePortalDataQuery(EVERY_FIELD);
    const parsed = parsePortalDataQuery(serialized);
    expect(parsed).toEqual({ ok: true, query: EVERY_FIELD, issues: [] });
    expect(parsed.query.inspectionTypeNumber).toBe("04");
  });

  it("accepts declared legacy aliases but emits canonical URL names", () => {
    const parsed = parsePortalDataQuery(
      "?from=2026-07-01&to=2026-07-12&location_id=loc-1&inspector_email=a%40b.com&pageSize=50"
    );
    expect(parsed).toEqual({
      ok: true,
      query: {
        dateFrom: "2026-07-01",
        dateTo: "2026-07-12",
        facilityId: "loc-1",
        inspector: "a@b.com",
        pageSize: 50,
      },
      issues: [],
    });
    expect(stringifyPortalDataQuery(parsed.query)).toBe(
      "from=2026-07-01&to=2026-07-12&facility=loc-1&inspector=a%40b.com&page_size=50"
    );
  });

  it("reports and omits invalid or ambiguous URL values", () => {
    const parsed = parsePortalDataQuery(
      "?from=2026-02-30&page=2.5&page_size=-1&sort=made_up&facility=one&location_id=two&bogus=x"
    );
    expect(parsed.ok).toBe(false);
    expect(parsed.query).toEqual({});
    expect(parsed.issues.map(({ code }) => code)).toEqual([
      "unsupported_parameter",
      "duplicate_parameter",
      "invalid_positive_integer",
      "invalid_positive_integer",
      "invalid_date",
      "unsupported_sort",
    ]);
  });

  it("throws when asked to serialize invalid canonical state", () => {
    expect(() => stringifyPortalDataQuery({ dateFrom: "not-a-date" })).toThrow(
      PortalDataQueryValidationError
    );
  });
});

describe("portal endpoint adapters", () => {
  it("maps report-list facility IDs to location_id and uses snake_case", () => {
    expect(adaptPortalQueryForReportList(EVERY_FIELD)).toEqual({
      from: "2026-07-01",
      to: "2026-07-12",
      location_id: "facility-123",
      yard: "Yard C",
      inspection_type: "04",
      inspector_email: "inspector@example.com",
      status: "completed",
      make: "Ford",
      model: "F-150",
      severity: "HIGH",
      damage_area: "Left rear",
      damage_type: "Dent & scratch",
      search: "VIN + report/42",
      page: 2,
      page_size: 50,
      sort: "created_at_desc",
      report_id: "report-42",
      vin: "1FTFW1E50PFA00001",
      module_key: "inspection_04",
    });
  });

  it("keeps analytics and snapshot mappings explicit", () => {
    const analytics = adaptPortalQueryForDashboardAnalytics(EVERY_FIELD);
    expect(analytics.facility_id).toBe("facility-123");
    expect(analytics.location_id).toBeUndefined();
    expect(analytics.page).toBeUndefined();
    expect(analytics.page_size).toBeUndefined();

    expect(adaptPortalQueryForHomeSnapshot(EVERY_FIELD)).toEqual({
      from: "2026-07-01",
      to: "2026-07-12",
      facility_id: "facility-123",
      yard: "Yard C",
      severity: "HIGH",
      damage_area: "Left rear",
      damage_type: "Dent & scratch",
      inspection_type: "04",
      module_key: "inspection_04",
      status: "completed",
      inspector_email: "inspector@example.com",
    });
  });

  it("does not forward active filters or paging to complete-dataset facets", () => {
    expect(adaptPortalQueryForFilterFacets()).toEqual({});
  });

  it("omits empty values at endpoint boundaries", () => {
    expect(
      adaptPortalQueryForReportList({ facilityId: " all ", yard: "", page: 1 })
    ).toEqual({ page: 1 });
  });
});
