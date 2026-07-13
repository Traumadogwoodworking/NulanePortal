import { beforeEach, describe, expect, it, vi } from "vitest";

const { getPortalFetchDebugSnapshot } = vi.hoisted(() => ({
  getPortalFetchDebugSnapshot: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({ getPortalFetchDebugSnapshot }));

import { getLatestPortalRequestDiagnostic } from "@/features/portal-diagnostics/portalRequestDiagnostics";

function entry(overrides: Record<string, unknown> = {}) {
  return {
    requestId: "req-1",
    method: "GET",
    path: "/reports/list?page=1",
    url: "https://api.invalid/reports/list?page=1",
    route: "/reports",
    callerLabel: "reports",
    startedAt: 1_000,
    startedAtIso: "2026-07-12T20:00:00.000Z",
    phase: "done",
    durationMs: 125,
    status: 200,
    ...overrides,
  };
}

describe("portal request diagnostics", () => {
  beforeEach(() => {
    getPortalFetchDebugSnapshot.mockReset();
    getPortalFetchDebugSnapshot.mockReturnValue({ active: [], history: [], lastErrors: [] });
  });

  it("selects the latest matching completed request without exposing its URL", () => {
    getPortalFetchDebugSnapshot.mockReturnValue({
      active: [],
      history: [entry(), entry({ requestId: "req-2", startedAt: 2_000, durationMs: 250 })],
      lastErrors: [],
    });

    expect(getLatestPortalRequestDiagnostic("/reports/list")).toEqual({
      request: {
        requestId: "req-2",
        startedAt: "2026-07-12T20:00:00.000Z",
        endedAt: "2026-07-12T20:00:00.250Z",
        durationMs: 250,
        status: 200,
      },
      errorCategory: "none",
      lastUpdated: "2026-07-12T20:00:00.250Z",
    });
  });

  it("reports active requests and classifies terminal failures", () => {
    getPortalFetchDebugSnapshot.mockReturnValue({
      active: [entry({ requestId: "active", phase: "fetch_start", status: undefined })],
      history: [entry({ requestId: "failed", startedAt: 500, status: 503, errorName: "PortalApiHttpError" })],
      lastErrors: [],
    });
    expect(getLatestPortalRequestDiagnostic("/reports/list")).toMatchObject({
      request: { requestId: "active", endedAt: null, status: "loading" },
      errorCategory: "none",
      lastUpdated: null,
    });

    getPortalFetchDebugSnapshot.mockReturnValue({
      active: [],
      history: [entry({ status: 503, errorName: "PortalApiHttpError" })],
      lastErrors: [],
    });
    expect(getLatestPortalRequestDiagnostic("/reports/list").errorCategory).toBe("server");
  });
});
