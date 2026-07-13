import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchDamageReportDetail,
  fetchDamageReportListSnapshot,
  fetchReportList,
  ReportsAdapter,
} from "@/lib/services/reportService";

const apiClientMocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  apiFetchResponse: vi.fn(),
}));

vi.mock("@/lib/apiClient", () => ({
  apiFetch: apiClientMocks.apiFetch,
  apiFetchResponse: apiClientMocks.apiFetchResponse,
}));

describe("reportService paginated snapshots", () => {
  beforeEach(() => {
    apiClientMocks.apiFetch.mockReset();
    apiClientMocks.apiFetchResponse.mockReset();
  });

  it("uses the report list endpoint for damage table filters", async () => {
    apiClientMocks.apiFetch.mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url, "http://localhost");
      expect(parsedUrl.pathname).toBe("/reports/list");
      expect(parsedUrl.searchParams.get("page")).toBe("1");
      expect(parsedUrl.searchParams.get("page_size")).toBe("50");
      expect(parsedUrl.searchParams.get("sort")).toBe("created_at_desc");
      expect(parsedUrl.searchParams.get("search")).toBe("toyota");
      expect(parsedUrl.searchParams.get("facility_id")).toBe("facility-1");
      expect(parsedUrl.searchParams.has("location_id")).toBe(false);
      expect(parsedUrl.searchParams.get("yard")).toBe("yard-a");
      expect(parsedUrl.searchParams.get("from")).toBe("2026-07-01");
      expect(parsedUrl.searchParams.get("to")).toBe("2026-07-09");
      expect(parsedUrl.searchParams.get("severity")).toBe("high");
      expect(parsedUrl.searchParams.get("damage_area")).toBe("hood");
      expect(parsedUrl.searchParams.get("damage_type")).toBe("scratch");
      return { rows: [], page: 1, pageSize: 50, total: 0, hasNextPage: false };
    });

    await fetchReportList({
      search: "toyota",
      facility_id: "facility-1",
      yard: "yard-a",
      from: "2026-07-01",
      to: "2026-07-09",
      severity: "high",
      damage_area: "hood",
      damage_type: "scratch",
    });
  });

  it("keeps damage detail hydration on report pull by report id", async () => {
    apiClientMocks.apiFetch.mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url, "http://localhost");
      expect(parsedUrl.pathname).toBe("/report/pull");
      expect(parsedUrl.searchParams.get("report_id")).toBe("damage-1");
      return { reports: [{ report_id: "damage-1" }] };
    });

    const report = await fetchDamageReportDetail("damage-1");

    expect(report?.report_id).toBe("damage-1");
  });

  it("retrieves every filtered damage-report page and deduplicates report ids", async () => {
    const requestedPages: number[] = [];
    apiClientMocks.apiFetch.mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url, "http://localhost");
      expect(parsedUrl.pathname).toBe("/reports/list");
      expect(parsedUrl.searchParams.get("facility_id")).toBe("facility-1");
      expect(parsedUrl.searchParams.get("yard")).toBe("yard-a");
      expect(parsedUrl.searchParams.get("inspection_type")).toBe("04");
      expect(parsedUrl.searchParams.get("severity")).toBe("high");
      expect(parsedUrl.searchParams.get("from")).toBe("2026-07-01");
      expect(parsedUrl.searchParams.get("to")).toBe("2026-07-09");
      const page = Number(parsedUrl.searchParams.get("page") ?? "1");
      requestedPages.push(page);

      return {
        rows:
          page === 1
            ? [
                { report_id: "damage-1", created_at: "2026-07-01T10:00:00.000Z" },
                { report_id: "damage-2", created_at: "2026-07-02T10:00:00.000Z" },
              ]
            : [
                { report_id: "damage-2", created_at: "2026-07-02T10:00:00.000Z" },
                { report_id: "damage-3", created_at: "2026-07-03T10:00:00.000Z" },
              ],
        page,
        pageSize: 2,
        total: 3,
        hasNextPage: page < 2,
      };
    });

    const reports = await fetchDamageReportListSnapshot({
      pageSize: 2,
      facility_id: "facility-1",
      yard: "yard-a",
      inspection_type: "04",
      severity: "high",
      from: "2026-07-01",
      to: "2026-07-09",
    });

    expect(reports.map((report) => report.report_id)).toEqual(["damage-1", "damage-2", "damage-3"]);
    expect(requestedPages).toEqual([1, 2]);
  });

  it("continues damage snapshots from hasNextPage when the API omits a reliable total", async () => {
    const requestedPages: number[] = [];
    apiClientMocks.apiFetch.mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url, "http://localhost");
      expect(parsedUrl.pathname).toBe("/reports/list");
      const page = Number(parsedUrl.searchParams.get("page") ?? "1");
      requestedPages.push(page);

      return {
        rows: page <= 3 ? [{ report_id: `damage-${page}`, created_at: `2026-07-0${page}T10:00:00.000Z` }] : [],
        page,
        pageSize: 1,
        hasNextPage: page < 3,
      };
    });

    const reports = await fetchDamageReportListSnapshot({ pageSize: 1, limit: 1 });

    expect(reports.map((report) => report.report_id)).toEqual(["damage-1", "damage-2", "damage-3"]);
    expect(requestedPages).toEqual([1, 2, 3]);
  });

  it("caps damage snapshot pagination when the API never reports a terminal page", async () => {
    const requestedPages: number[] = [];
    apiClientMocks.apiFetch.mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url, "http://localhost");
      const page = Number(parsedUrl.searchParams.get("page") ?? "1");
      requestedPages.push(page);
      return {
        rows: [{ report_id: `damage-${page}` }],
        page,
        pageSize: 1,
        hasNextPage: true,
      };
    });

    const reports = await fetchDamageReportListSnapshot({ pageSize: 1 });

    expect(reports).toHaveLength(100);
    expect(requestedPages).toHaveLength(100);
    expect(requestedPages.at(-1)).toBe(100);
  });

  it("fetches RSA report pages only inside the recent five day window", async () => {
    const requestedOffsets: number[] = [];
    const requestedFromValues: string[] = [];
    const requestedToValues: string[] = [];
    const recentDate = new Date().toISOString();
    const oldDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    apiClientMocks.apiFetch.mockImplementation(async (url: string) => {
      const parsedUrl = new URL(url, "http://localhost");
      expect(parsedUrl.pathname).toBe("/railcar-scans/report/pull");
      const offset = Number(parsedUrl.searchParams.get("offset") ?? "0");
      requestedOffsets.push(offset);
      requestedFromValues.push(parsedUrl.searchParams.get("date_from") ?? "");
      requestedToValues.push(parsedUrl.searchParams.get("date_to") ?? "");
      const pageSize = Number(parsedUrl.searchParams.get("limit") ?? "200");
      expect(pageSize).toBe(200);
      const page = offset === 0 ? 1 : 2;
      const count = page === 1 ? pageSize : 1;

      return {
        reports: Array.from({ length: count }, (_, index) => ({
          report_id: `rsa-${page}-${index}`,
          created_at: page === 1 ? recentDate : oldDate,
        })),
        page,
        pageSize,
        total: 201,
        pagination: {
          total: 201,
          limit: pageSize,
          offset,
          has_more: page < 2,
        },
      };
    });

    const reports = await ReportsAdapter.fetchRsaReports();

    expect(reports).toHaveLength(200);
    expect(reports[0]?.report_id).toBe("rsa-1-0");
    expect(reports.at(-1)?.report_id).toBe("rsa-1-199");
    expect(requestedOffsets).toEqual([0, 200]);
    expect(requestedFromValues.every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))).toBe(true);
    expect(requestedToValues.every((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))).toBe(true);
  });
});
