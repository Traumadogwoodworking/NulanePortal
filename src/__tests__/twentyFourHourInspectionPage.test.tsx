import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SWRConfig } from "swr";
import TwentyFourHourInspectionPage from "@/app/inspection/24-hour/page";
import type { TwentyFourHourInspectionResponse } from "@/lib/services/twentyFourHourInspectionService";

const serviceMocks = vi.hoisted(() => ({ fetch: vi.fn() }));
const fileSaverMocks = vi.hoisted(() => ({ saveAs: vi.fn() }));

let requestIndex = 1;

vi.mock("file-saver", () => ({ saveAs: fileSaverMocks.saveAs }));

vi.mock("@/lib/services/twentyFourHourInspectionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/twentyFourHourInspectionService")>();
  return { ...actual, fetchTwentyFourHourInspectionDisplay: serviceMocks.fetch };
});

vi.mock("@/lib/portalSession", () => ({
  usePortalSession: () => ({
    status: "success",
    assignedLocationIds: ["location-jnap"],
    selectedLocationId: "location-jnap",
    locationLocked: true,
    twentyFourHourFacility: {
      location_id: "location-shap",
      location_label: "SHAP",
      location_name: "Sterling Heights Assembly Plant",
    },
    locations: [
      {
        location_id: "location-shap",
        location_label: "SHAP",
        location_name: "Sterling Heights Assembly Plant",
      },
      {
        location_id: "location-jnap",
        location_label: "JNAP",
        location_name: "Jefferson North Assembly Plant",
      },
    ],
  }),
}));

function normalizeParams(raw: Record<string, unknown> = {}) {
  const pageCandidate = typeof raw.page === "number"
    ? raw.page
    : typeof raw.page === "string"
      ? Number.parseInt(raw.page, 10)
      : 1;
  const pageSizeCandidate = typeof raw.pageSize === "number"
    ? raw.pageSize
    : typeof raw.pageSize === "string"
      ? Number.parseInt(raw.pageSize, 10)
      : 250;

  const facility = typeof raw.facility === "string"
    ? raw.facility
    : typeof raw.facility_id === "string"
      ? raw.facility_id
      : typeof raw.facilityId === "string"
        ? raw.facilityId
        : null;

  return {
    facility,
    facilityId: typeof raw.facilityId === "string" ? raw.facilityId : null,
    facility_id: typeof raw.facility_id === "string" ? raw.facility_id : null,
    bucket: typeof raw.bucket === "string" ? raw.bucket : null,
    severity: typeof raw.severity === "string" ? raw.severity : null,
    inspected: raw.inspected as boolean | string | null,
    page: Number.isFinite(pageCandidate) && pageCandidate > 0 ? pageCandidate : 1,
    pageSize: Number.isFinite(pageSizeCandidate) && pageSizeCandidate > 0 ? pageSizeCandidate : 250,
  };
}

function responseByParams(
  params: {
    facility?: string | null;
    facilityId?: string | null;
    facility_id?: string | null;
    bucket?: string | null;
    severity?: string | null;
    inspected?: boolean | string | null;
    page?: number;
    pageSize?: number;
  } = {},
  requestId = "request-1"
): TwentyFourHourInspectionResponse {
  const {
    facility = null,
    facilityId = null,
    facility_id = null,
    bucket = null,
    severity = null,
    inspected = null,
    page = 1,
    pageSize = 250,
  } = params;
  const requestedFacility = String(facility || facility_id || facilityId || "").trim().toLowerCase();
  const requestedBucket = String(bucket || "").trim().toLowerCase();
  const requestedSeverity = String(severity || "").trim().toLowerCase();
  const requestedInspected = typeof inspected === "string"
    ? inspected === "true"
    : inspected;

  const allRows = ([
    {
      id: "snapshot-1:1", inventory_row_id: "snapshot-1:1", snapshot_id: "snapshot-1", vin: "UNINSPECTEDVIN001",
      bucket: "needs_inspected", inspected: false, severity: "overdue", display_label: "Overdue · 1h 0m",
      display_background_color: "#000000", display_text_color: "#ffffff",
      first_seen_at: "2026-07-18T10:00:00.000Z", last_seen_at: "2026-07-19T10:55:00.000Z", current_server_time: "2026-07-19T11:00:00.000Z",
      time_in_inventory_seconds: 90_000, time_until_24h_seconds: 0, overdue_seconds: 3_600,
      facility: "SHAP", facility_id: "location-shap", location_id: "location-shap", location: "SHAP/A12", location_name: "SHAP/A12",
      location_label: "SHAP",
    },
    {
      id: "snapshot-1:2", inventory_row_id: "snapshot-1:2", snapshot_id: "snapshot-1", vin: "INSPECTEDVIN00001",
      bucket: "inspected", inspected: true, severity: "inspected", display_label: "Inspected",
      first_seen_at: "2026-07-18T09:00:00.000Z", last_seen_at: "2026-07-19T10:55:00.000Z", current_server_time: "2026-07-19T11:00:00.000Z",
      time_in_inventory_seconds: 93_600, time_until_24h_seconds: 0, overdue_seconds: 0,
      inspected_at: "2026-07-19T10:00:00.000Z", report_id: "report-inspected-1", facility: "JNAP", facility_id: "location-jnap", location_id: "location-jnap", location: "JNAP/B07", location_name: "JNAP/B07",
      location_label: "JNAP",
    },
  ] satisfies TwentyFourHourInspectionResponse["rows"]).filter((row) => {
    if (requestedFacility && ![row.facility, row.location_id, row.facility_id].some((value) => value.toLowerCase() === requestedFacility)) return false;
    if (requestedBucket && row.bucket !== requestedBucket) return false;
    if (requestedSeverity && row.severity !== requestedSeverity) return false;
    if (typeof requestedInspected === "boolean" && row.inspected !== requestedInspected) return false;
    return true;
  });

  const summaryRows = allRows;
  const start = (Math.max(page, 1) - 1) * pageSize;
  const rows = allRows.slice(start, start + pageSize);

  return {
    ok: true,
    request_id: requestId,
    inspection_type: "24_hour",
    generated_at: "2026-07-19T11:00:00.000Z",
    current_server_time: "2026-07-19T11:00:00.000Z",
    archive_window_days: 3,
    snapshot: {
      id: "snapshot-1",
      status: "completed",
      capture_time: "2026-07-19T10:55:00.000Z",
      completed_at: "2026-07-19T10:56:00.000Z",
      total_raw_rows: summaryRows.length,
      accepted_active_rows: rows.length,
      excluded_stale_rows: 1,
      rejected_malformed_rows: 0,
      deduplicated_rows: 0,
    },
    summary: {
      total_active: summaryRows.length,
      needs_inspected: summaryRows.filter((row) => !row.inspected).length,
      normal: summaryRows.filter((row) => String(row.severity) === "normal").length,
      due_12h: summaryRows.filter((row) => String(row.severity) === "due_12h").length,
      critical: summaryRows.filter((row) => String(row.severity) === "critical").length,
      overdue: summaryRows.filter((row) => row.severity === "overdue").length,
      inspected: summaryRows.filter((row) => row.inspected).length,
    },
    totals: {
      total_active: summaryRows.length,
      needs_inspected: summaryRows.filter((row) => !row.inspected).length,
      inspected: summaryRows.filter((row) => row.inspected).length,
    },
    metadata: {
      total_raw_rows: summaryRows.length,
      accepted_active_rows: summaryRows.length,
      excluded_stale_rows: 1,
      rejected_malformed_rows: 0,
      deduplicated_rows: 0,
      client_rejected_rows: 0,
      client_excluded_stale_rows: 0,
      client_deduplicated_rows: 0,
    },
    filter_options: {
      facilities: {
        SHAP: summaryRows.filter((row) => row.facility === "SHAP").length,
        JNAP: summaryRows.filter((row) => row.facility === "JNAP").length,
      },
    },
    filters: {
      facility: requestedFacility,
      facility_id,
      facilityId,
      bucket: requestedBucket || undefined,
      severity: requestedSeverity || undefined,
      inspected: requestedInspected,
      page: String(page),
      pageSize: String(pageSize),
    },
    pagination: {
      page,
      page_size: pageSize,
      total_count: summaryRows.length,
      returned_count: rows.length,
      has_more: summaryRows.length > start + pageSize,
    },
    rows,
    warnings: [],
  };
}

function responseFromFetch(params: Record<string, unknown> = {}): TwentyFourHourInspectionResponse {
  const query = normalizeParams(params);
  return responseByParams(query, `request-${requestIndex++}`);
}

function response(vin = "UNINSPECTEDVIN001", requestId = "request-1"): TwentyFourHourInspectionResponse {
  const payload = responseByParams({
    facility: null,
    facility_id: null,
    facilityId: null,
    page: 1,
    pageSize: 250,
  }, requestId);
  if (payload.rows.length > 0) {
    const rows = [...payload.rows];
    rows[0] = { ...rows[0], vin };
    return { ...payload, rows };
  }
  return payload;
}

function renderPage() {
  return render(
    <SWRConfig value={{ provider: () => new Map() }}>
      <TwentyFourHourInspectionPage />
    </SWRConfig>
  );
}

describe("24-hour inspection page", () => {
  beforeEach(() => {
    requestIndex = 1;
    serviceMocks.fetch.mockReset();
    fileSaverMocks.saveAs.mockReset();
    serviceMocks.fetch.mockImplementation((params: Record<string, unknown>) => Promise.resolve(responseFromFetch(params)));
  });

  it("renders overdues and pinned table chrome without development diagnostics", async () => {
    renderPage();
    expect(await screen.findByText("Overdue · 1h 0m")).toHaveStyle({ backgroundColor: "#000000", color: "#ffffff" });
    expect(screen.getByText("A12")).toBeInTheDocument();
    expect(screen.queryByText("SHAP/SHAP/A12")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Development snapshot diagnostics")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Search inspected and uninspected records").parentElement?.parentElement).toHaveClass("sticky", "top-0", "z-30");
    expect(screen.getByRole("columnheader", { name: "VIN" }).closest("thead")).toHaveClass("sticky", "z-20");
    expect(screen.getByRole("link", { name: "Open" })).toHaveAttribute(
      "href",
      "/reports/damage?focus=report-inspected-1"
    );
    expect(screen.getByText("Time to inspect:").parentElement).toHaveTextContent("1d 2h 0m");
    expect(screen.getByText("Turnaround:").parentElement).toHaveTextContent("1d 2h 0m");

    const initialParams = serviceMocks.fetch.mock.calls.at(0)?.[0] as Record<string, unknown>;
    expect(initialParams).toEqual(expect.objectContaining({ page: 1, pageSize: 250 }));
    expect(initialParams).not.toHaveProperty("facility");
  });

  it("filters facilities locally without another backend request", async () => {
    const user = userEvent.setup();
    renderPage();

    const facility = await screen.findByLabelText("Filter returned inventory by facility");
    expect(facility).toHaveValue("");
    expect(screen.getByRole("option", { name: "All returned facilities" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "SHAP (1 inventory)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "JNAP (1 inventory)" })).toBeInTheDocument();

    await user.selectOptions(facility, "JNAP");

    await waitFor(() => expect(screen.queryByText("UNINSPECTEDVIN001")).not.toBeInTheDocument());
    expect(screen.getByText("INSPECTEDVIN00001")).toBeInTheDocument();

    expect(serviceMocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("uses full-snapshot backend totals immediately and keeps them fixed while filters change visible rows", async () => {
    const user = userEvent.setup();
    renderPage();

    const active = await screen.findByRole("button", { name: "Filter records by Active" });
    const uninspected = screen.getByRole("button", { name: "Filter records by Uninspected" });
    const inspected = screen.getByRole("button", { name: "Filter records by Inspected" });
    const overdue = screen.getByRole("button", { name: "Filter records by Overdue" });
    expect(active).toHaveTextContent("2");
    expect(uninspected).toHaveTextContent("1");
    expect(inspected).toHaveTextContent("1");
    expect(overdue).toHaveTextContent("1");

    await user.selectOptions(screen.getByLabelText("Filter returned inventory by facility"), "JNAP");

    await waitFor(() => expect(screen.queryByText("UNINSPECTEDVIN001")).not.toBeInTheDocument());
    expect(active).toHaveTextContent("2");
    expect(uninspected).toHaveTextContent("1");
    expect(inspected).toHaveTextContent("1");
    expect(overdue).toHaveTextContent("1");

    await user.type(screen.getByLabelText("Search inspected and uninspected records"), "missing-vin");
    expect(active).toHaveTextContent("2");
    expect(uninspected).toHaveTextContent("1");
    expect(inspected).toHaveTextContent("1");
    expect(overdue).toHaveTextContent("1");
  });

  it("shows full backend totals before later inventory pages finish loading", async () => {
    const firstPage = responseFromFetch({ page: 1, pageSize: 250 });
    firstPage.summary = {
      ...firstPage.summary,
      total_active: 600,
      needs_inspected: 420,
      inspected: 180,
      critical: 90,
      overdue: 70,
    };
    firstPage.pagination = {
      ...firstPage.pagination,
      total_count: 600,
      has_more: true,
    };
    let resolveSecondPage!: (value: TwentyFourHourInspectionResponse) => void;
    const secondPage = new Promise<TwentyFourHourInspectionResponse>((resolve) => {
      resolveSecondPage = resolve;
    });
    serviceMocks.fetch
      .mockResolvedValueOnce(firstPage)
      .mockReturnValueOnce(secondPage);

    renderPage();

    expect(await screen.findByRole("button", { name: "Filter records by Active" })).toHaveTextContent("600");
    expect(screen.getByRole("button", { name: "Filter records by Uninspected" })).toHaveTextContent("420");
    expect(screen.getByRole("button", { name: "Filter records by Inspected" })).toHaveTextContent("180");
    expect(screen.getByRole("button", { name: "Filter records by Critical" })).toHaveTextContent("90");
    expect(screen.getByRole("button", { name: "Filter records by Overdue" })).toHaveTextContent("70");

    resolveSecondPage({
      ...responseFromFetch({ page: 2, pageSize: 250 }),
      pagination: { page: 2, page_size: 250, total_count: 600, returned_count: 0, has_more: false },
      rows: [],
    });
    await waitFor(() => expect(serviceMocks.fetch).toHaveBeenCalledTimes(2));
  });

  it("searches both inspected and uninspected records", async () => {
    const user = userEvent.setup();
    renderPage();
    const search = await screen.findByLabelText("Search inspected and uninspected records");
    await user.type(search, "INSPECTEDVIN");
    expect(screen.getByText("INSPECTEDVIN00001")).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "UNINSPECTEDVIN");
    expect(screen.getByText("UNINSPECTEDVIN001")).toBeInTheDocument();
  });

  it("filters by inspection state via the backend", async () => {
    const user = userEvent.setup();
    renderPage();
    const filter = await screen.findByLabelText("Filter records by inspection state or status");

    await user.selectOptions(filter, "inspected");
    await waitFor(() => expect(screen.queryByText("UNINSPECTEDVIN001")).not.toBeInTheDocument());
    expect(screen.getByText("INSPECTEDVIN00001")).toBeInTheDocument();

    await user.selectOptions(filter, "all");
    await waitFor(() => expect(screen.getByText("UNINSPECTEDVIN001")).toBeInTheDocument());
    expect(screen.getByText("INSPECTEDVIN00001")).toBeInTheDocument();

  });

  it("uses summary cards as toggleable record filters", async () => {
    const user = userEvent.setup();
    renderPage();

    const overdue = await screen.findByRole("button", { name: "Filter records by Overdue" });
    expect(serviceMocks.fetch).toHaveBeenCalledTimes(1);
    await user.click(overdue);
    expect(overdue).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Filter records by inspection state or status")).toHaveValue("overdue");
    expect(screen.getByText("UNINSPECTEDVIN001")).toBeInTheDocument();
    expect(screen.queryByText("INSPECTEDVIN00001")).not.toBeInTheDocument();
    expect(serviceMocks.fetch).toHaveBeenCalledTimes(1);

    await user.click(overdue);
    expect(overdue).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Filter records by inspection state or status")).toHaveValue("all");
    expect(screen.getByText("INSPECTEDVIN00001")).toBeInTheDocument();
    expect(serviceMocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("exports only the currently visible rows in displayed order", async () => {
    const user = userEvent.setup();
    renderPage();

    const search = await screen.findByLabelText("Search inspected and uninspected records");
    await user.type(search, "INSPECTEDVIN00001");
    await user.click(screen.getByRole("button", { name: "Export to Excel" }));

    expect(fileSaverMocks.saveAs).toHaveBeenCalledOnce();
    const [blob, filename] = fileSaverMocks.saveAs.mock.calls[0] as [Blob, string];
    const csv = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(blob);
    });
    expect(filename).toMatch(/^24-hour-work-queue-\d{4}-\d{2}-\d{2}\.csv$/);
    expect(csv).toContain('"1","INSPECTEDVIN00001","Inspected"');
    expect(csv).not.toContain("UNINSPECTEDVIN001");
  });

  it("replaces rows after a manual refresh", async () => {
    serviceMocks.fetch.mockReset();
    serviceMocks.fetch
      .mockResolvedValueOnce(response("UNINSPECTEDVIN001", "request-initial"))
      .mockResolvedValueOnce(response("NEWERVIN000000001", "request-new"));

    const user = userEvent.setup();
    renderPage();
    await screen.findByText("UNINSPECTEDVIN001");

    await user.click(screen.getByRole("button", { name: "Refresh" }));

    expect(await screen.findByText("NEWERVIN000000001")).toBeInTheDocument();
    expect(serviceMocks.fetch).toHaveBeenCalledTimes(2);
  });

  it("does not re-hit the backend when a tab regains focus", async () => {
    renderPage();

    await screen.findByText("UNINSPECTEDVIN001");
    expect(serviceMocks.fetch).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    await act(async () => {});
    expect(serviceMocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not install a 30-second auto-refresh timer", async () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    renderPage();

    await screen.findByText("UNINSPECTEDVIN001");
    const autoRefreshTimer = setIntervalSpy.mock.calls.find(([, delay]) => delay === 30_000);
    expect(autoRefreshTimer).toBeUndefined();
    expect(serviceMocks.fetch).toHaveBeenCalledTimes(1);
    setIntervalSpy.mockRestore();
  });

  it("sends initial pagination request as page=1 and pageSize=250", async () => {
    renderPage();
    expect(await screen.findByText("UNINSPECTEDVIN001")).toBeInTheDocument();

    const initialCall = serviceMocks.fetch.mock.calls.at(0)?.[0] as Record<string, unknown>;
    expect(initialCall).toEqual(expect.objectContaining({ page: 1, pageSize: 250 }));
  });
});
