import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PortalDataInspector } from "@/features/portal-diagnostics/PortalDataInspector";
import {
  isPortalDataInspectorRuntimeEnabled,
  normalizeDiagnosticEndpoint,
  normalizePortalDataInspectorInput,
  redactCanonicalFilters,
  redactEndpointParams,
} from "@/features/portal-diagnostics/portalDataInspectorNormalization";

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
});

describe("portal data inspector normalization", () => {
  it("normalizes the complete safe diagnostic surface", () => {
    const normalized = normalizePortalDataInspectorInput({
      canonicalFilters: {
        facilityId: "facility-1",
        yard: "yard-1",
        inspectionTypeNumber: "04",
        inspector: "person@example.com",
        search: "sensitive search",
      },
      endpointParams: {
        facility_id: "facility-1",
        inspection_type: "04",
        page: 2,
        inspector_email: "person@example.com",
      },
      activeEndpoint: "https://api.example.test/reports/list?token=secret&search=private",
      request: {
        requestId: "req-123",
        startedAt: "2026-07-12T18:45:00.000Z",
        endedAt: "2026-07-12T18:45:00.125Z",
        status: 200,
      },
      rowCount: 25,
      totalCount: 81,
      facetSource: "reports/filter-options",
      facetCounts: { facilities: 3, yards: 8, inspectionTypes: 10, unknown: 999 },
      snapshotStatus: "ready",
      cacheState: "fresh",
      errorCategory: "none",
      lastUpdated: "2026-07-12T18:45:01.000Z",
    });

    expect(normalized.canonicalFilters).toMatchObject({
      facilityId: "facility-1",
      yard: "yard-1",
      inspectionTypeNumber: "04",
      inspector: "[redacted]",
      search: "[redacted]",
    });
    expect(normalized.endpointParams.inspector_email).toBe("[redacted]");
    expect(normalized.activeEndpoint).toBe("/reports/list");
    expect(normalized.request).toEqual({
      requestId: "req-123",
      startedAt: "2026-07-12T18:45:00.000Z",
      endedAt: "2026-07-12T18:45:00.125Z",
      durationMs: 125,
      status: 200,
    });
    expect(normalized.counts).toEqual({ rows: 25, total: 81 });
    expect(normalized.facets).toEqual({
      source: "reports/filter-options",
      counts: { facilities: 3, yards: 8, inspectionTypes: 10 },
    });
    expect(normalized.snapshotStatus).toBe("ready");
    expect(normalized.cacheState).toBe("fresh");
    expect(normalized.errorCategory).toBe("none");
    expect(normalized.lastUpdated).toBe("2026-07-12T18:45:01.000Z");
  });

  it("removes credential fields, redacts PII filters, and never exposes URL query strings", () => {
    const canonical = redactCanonicalFilters({
      inspector: "private@example.com",
      search: "1HGBH41JXMN109186",
      accessToken: "top-secret-token",
      password: "top-secret-password",
      facilityId: "facility-1",
    });
    const params = redactEndpointParams({
      authorization: "Bearer top-secret-token",
      cookie: "session=top-secret-cookie",
      inspector_email: "private@example.com",
      search: "1HGBH41JXMN109186",
      yard_id: "yard-1",
      raw_payload: { private: true },
    });
    const serialized = JSON.stringify({ canonical, params });

    expect(serialized).not.toContain("top-secret");
    expect(serialized).not.toContain("private@example.com");
    expect(serialized).not.toContain("1HGBH41JXMN109186");
    expect(serialized).not.toContain("raw_payload");
    expect(serialized).toContain("[redacted]");
    expect(normalizeDiagnosticEndpoint("/reports/list?authorization=secret#private")).toBe("/reports/list");
  });

  it("uses controlled unknown states for invalid diagnostic values", () => {
    const normalized = normalizePortalDataInspectorInput({
      activeEndpoint: "",
      request: { requestId: "unsafe request id with spaces", durationMs: -1, status: "raw server error" },
      rowCount: -1,
      totalCount: Number.POSITIVE_INFINITY,
      facetSource: "source with private free text",
      snapshotStatus: "unexpected",
      cacheState: "unexpected",
      errorCategory: "database password failed",
      lastUpdated: "invalid",
    });

    expect(normalized.activeEndpoint).toBeNull();
    expect(normalized.request).toMatchObject({ requestId: null, durationMs: null, status: "unknown" });
    expect(normalized.counts).toEqual({ rows: null, total: null });
    expect(normalized.facets.source).toBe("unknown");
    expect(normalized.snapshotStatus).toBe("unknown");
    expect(normalized.cacheState).toBe("unknown");
    expect(normalized.errorCategory).toBe("unknown");
    expect(normalized.lastUpdated).toBeNull();
  });
});

describe("PortalDataInspector", () => {
  it("is development-enabled or production-enabled only by an explicit public flag", () => {
    expect(isPortalDataInspectorRuntimeEnabled("development", undefined)).toBe(true);
    expect(isPortalDataInspectorRuntimeEnabled("production", undefined)).toBe(false);
    expect(isPortalDataInspectorRuntimeEnabled("production", "1")).toBe(true);
  });

  it("does not render in production without the explicit public flag", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_PORTAL_DATA_INSPECTOR", "");
    render(<PortalDataInspector data={{ activeEndpoint: "/reports/list" }} />);
    expect(screen.queryByLabelText("Portal data inspector")).not.toBeInTheDocument();
  });

  it("renders only normalized, redacted diagnostics when explicitly enabled", () => {
    vi.stubEnv("NEXT_PUBLIC_PORTAL_DATA_INSPECTOR", "1");
    render(
      <PortalDataInspector
        defaultOpen
        data={{
          canonicalFilters: { inspectionTypeNumber: "04", inspector: "private@example.com" },
          endpointParams: { inspection_type: "04", authorization: "Bearer secret" },
          activeEndpoint: "/reports/filter-options?token=secret",
          errorCategory: "none",
        }}
      />,
    );

    const inspector = screen.getByLabelText("Portal data inspector");
    expect(inspector).toHaveTextContent("inspectionTypeNumber");
    expect(inspector).toHaveTextContent("04");
    expect(inspector).toHaveTextContent("[redacted]");
    expect(inspector).not.toHaveTextContent("private@example.com");
    expect(inspector).not.toHaveTextContent("Bearer secret");
    expect(inspector).not.toHaveTextContent("token=secret");
  });

  it("honors the local enabled toggle", () => {
    vi.stubEnv("NEXT_PUBLIC_PORTAL_DATA_INSPECTOR", "1");
    render(<PortalDataInspector enabled={false} data={{}} />);
    expect(screen.queryByLabelText("Portal data inspector")).not.toBeInTheDocument();
  });
});
