import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TwentyFourHourInspectionPage from "@/app/inspection/24-hour/page";
import type { TwentyFourHourInspectionResponse } from "@/lib/services/twentyFourHourInspectionService";

const serviceMocks = vi.hoisted(() => ({ fetch: vi.fn() }));
const fileSaverMocks = vi.hoisted(() => ({ saveAs: vi.fn() }));

vi.mock("file-saver", () => ({ saveAs: fileSaverMocks.saveAs }));

vi.mock("@/lib/services/twentyFourHourInspectionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/twentyFourHourInspectionService")>();
  return { ...actual, fetchTwentyFourHourInspectionDisplay: serviceMocks.fetch };
});

vi.mock("@/lib/portalSession", () => ({
  usePortalSession: () => ({
    status: "success",
    selectedLocationId: "location-jnap",
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

function response(vin = "UNINSPECTEDVIN001", requestId = "request-1"): TwentyFourHourInspectionResponse {
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
      total_raw_rows: 2,
      accepted_active_rows: 2,
      excluded_stale_rows: 1,
      rejected_malformed_rows: 0,
      deduplicated_rows: 0,
    },
    summary: { total_active: 2, needs_inspected: 1, normal: 0, due_12h: 0, critical: 0, overdue: 1, inspected: 1 },
    totals: { total_active: 2, needs_inspected: 1, inspected: 1 },
    metadata: {
      total_raw_rows: 2,
      accepted_active_rows: 2,
      excluded_stale_rows: 1,
      rejected_malformed_rows: 0,
      deduplicated_rows: 0,
      client_rejected_rows: 0,
      client_excluded_stale_rows: 0,
      client_deduplicated_rows: 0,
    },
    rows: [
      {
        id: "snapshot-1:1", inventory_row_id: "snapshot-1:1", snapshot_id: "snapshot-1", vin,
        bucket: "needs_inspected", inspected: false, severity: "overdue", display_label: "Overdue · 1h 0m",
        display_background_color: "#000000", display_text_color: "#ffffff",
        first_seen_at: "2026-07-18T10:00:00.000Z", last_seen_at: "2026-07-19T10:55:00.000Z", current_server_time: "2026-07-19T11:00:00.000Z",
        time_in_inventory_seconds: 90_000, time_until_24h_seconds: 0, overdue_seconds: 3_600,
        facility: "SHAP", location: "SHAP/SHAP/A12",
      },
      {
        id: "snapshot-1:2", inventory_row_id: "snapshot-1:2", snapshot_id: "snapshot-1", vin: "INSPECTEDVIN00001",
        bucket: "inspected", inspected: true, severity: "inspected", display_label: "Inspected",
        first_seen_at: "2026-07-18T09:00:00.000Z", last_seen_at: "2026-07-19T10:55:00.000Z", current_server_time: "2026-07-19T11:00:00.000Z",
        time_in_inventory_seconds: 93_600, time_until_24h_seconds: 0, overdue_seconds: 0,
        inspected_at: "2026-07-19T10:00:00.000Z", report_id: "report-inspected-1", facility: "JNAP", location: "JNAP/JNAP/B07",
      },
    ],
    warnings: [],
  };
}

describe("24-hour inspection page", () => {
  beforeEach(() => {
    serviceMocks.fetch.mockReset();
    fileSaverMocks.saveAs.mockReset();
  });

  it("renders Overdue, normalized bays, and pinned controls without development diagnostics", async () => {
    serviceMocks.fetch.mockResolvedValue(response());
    render(<TwentyFourHourInspectionPage />);
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
    expect(serviceMocks.fetch).toHaveBeenCalledWith(expect.not.objectContaining({ facility: expect.anything() }));
  });

  it("shows one facility selector sourced from the returned inventory and filters locally", async () => {
    const user = userEvent.setup();
    serviceMocks.fetch.mockResolvedValue(response());
    render(<TwentyFourHourInspectionPage />);

    const facility = await screen.findByLabelText("Filter returned inventory by facility");
    expect(facility).toHaveValue("");
    expect(screen.queryByLabelText("24-hour facility")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "All returned facilities" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "SHAP (1 inventory)" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "JNAP (1 inventory)" })).toBeInTheDocument();

    await user.selectOptions(facility, "JNAP");

    expect(screen.queryByText("UNINSPECTEDVIN001")).not.toBeInTheDocument();
    expect(screen.getByText("INSPECTEDVIN00001")).toBeInTheDocument();
    expect(serviceMocks.fetch).toHaveBeenCalledTimes(1);
  });

  it("updates the headline totals from the current search and facility filters", async () => {
    const user = userEvent.setup();
    serviceMocks.fetch.mockResolvedValue(response());
    render(<TwentyFourHourInspectionPage />);

    const active = await screen.findByRole("button", { name: "Filter records by Active" });
    const uninspected = screen.getByRole("button", { name: "Filter records by Uninspected" });
    const inspected = screen.getByRole("button", { name: "Filter records by Inspected" });
    const overdue = screen.getByRole("button", { name: "Filter records by Overdue" });
    expect(active).toHaveTextContent("2");
    expect(uninspected).toHaveTextContent("1");
    expect(inspected).toHaveTextContent("1");
    expect(overdue).toHaveTextContent("1");

    await user.selectOptions(screen.getByLabelText("Filter returned inventory by facility"), "JNAP");

    expect(active).toHaveTextContent("1");
    expect(uninspected).toHaveTextContent("0");
    expect(inspected).toHaveTextContent("1");
    expect(overdue).toHaveTextContent("0");

    await user.type(screen.getByLabelText("Search inspected and uninspected records"), "missing-vin");
    expect(active).toHaveTextContent("0");
    expect(inspected).toHaveTextContent("0");
  });

  it("searches both inspected and uninspected records", async () => {
    const user = userEvent.setup();
    serviceMocks.fetch.mockResolvedValue(response());
    render(<TwentyFourHourInspectionPage />);
    const search = await screen.findByLabelText("Search inspected and uninspected records");
    await user.type(search, "INSPECTEDVIN");
    expect(screen.getByText("INSPECTEDVIN00001")).toBeInTheDocument();
    await user.clear(search);
    await user.type(search, "UNINSPECTEDVIN");
    expect(screen.getByText("UNINSPECTEDVIN001")).toBeInTheDocument();
  });

  it("filters by inspection state without discarding the canonical dataset", async () => {
    const user = userEvent.setup();
    serviceMocks.fetch.mockResolvedValue(response());
    render(<TwentyFourHourInspectionPage />);
    const filter = await screen.findByLabelText("Filter records by inspection state or status");
    await user.selectOptions(filter, "inspected");
    expect(screen.queryByText("UNINSPECTEDVIN001")).not.toBeInTheDocument();
    expect(screen.getByText("INSPECTEDVIN00001")).toBeInTheDocument();
    await user.selectOptions(filter, "all");
    expect(screen.getByText("UNINSPECTEDVIN001")).toBeInTheDocument();
  });

  it("uses the summary boxes as toggleable record filters", async () => {
    const user = userEvent.setup();
    serviceMocks.fetch.mockResolvedValue(response());
    render(<TwentyFourHourInspectionPage />);

    const overdue = await screen.findByRole("button", { name: "Filter records by Overdue" });
    await user.click(overdue);
    expect(overdue).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Filter records by inspection state or status")).toHaveValue("overdue");
    expect(screen.getByText("UNINSPECTEDVIN001")).toBeInTheDocument();
    expect(screen.queryByText("INSPECTEDVIN00001")).not.toBeInTheDocument();

    await user.click(overdue);
    expect(overdue).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Filter records by inspection state or status")).toHaveValue("all");
    expect(screen.getByText("INSPECTEDVIN00001")).toBeInTheDocument();
  });

  it("exports only the currently visible rows in their displayed order", async () => {
    const user = userEvent.setup();
    serviceMocks.fetch.mockResolvedValue(response());
    render(<TwentyFourHourInspectionPage />);

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

  it("prevents an older request from overwriting a newer successful refresh", async () => {
    let resolveFirst!: (value: TwentyFourHourInspectionResponse) => void;
    let resolveSecond!: (value: TwentyFourHourInspectionResponse) => void;
    serviceMocks.fetch
      .mockReturnValueOnce(new Promise((resolve) => { resolveFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { resolveSecond = resolve; }));
    const user = userEvent.setup();
    render(<TwentyFourHourInspectionPage />);
    await user.click(screen.getByRole("button", { name: "Refreshing" }));
    await act(async () => resolveSecond(response("NEWERVIN000000001", "request-new")));
    expect(await screen.findByText("NEWERVIN000000001")).toBeInTheDocument();
    await act(async () => resolveFirst(response("OLDERVIN000000001", "request-old")));
    await waitFor(() => expect(screen.queryByText("OLDERVIN000000001")).not.toBeInTheDocument());
    expect(screen.getByText("NEWERVIN000000001")).toBeInTheDocument();
  });

  it("re-hits the backend when a long-lived tab regains focus", async () => {
    serviceMocks.fetch.mockResolvedValue(response());
    render(<TwentyFourHourInspectionPage />);

    await screen.findByText("UNINSPECTEDVIN001");
    expect(serviceMocks.fetch).toHaveBeenCalledTimes(1);

    act(() => {
      window.dispatchEvent(new Event("focus"));
    });

    await waitFor(() => expect(serviceMocks.fetch).toHaveBeenCalledTimes(2));
  });

  it("refreshes an active tab every 30 seconds", async () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");
    serviceMocks.fetch.mockResolvedValue(response());
    render(<TwentyFourHourInspectionPage />);

    await screen.findByText("UNINSPECTEDVIN001");
    const autoRefreshTimer = setIntervalSpy.mock.calls.find(([, delay]) => delay === 30_000);
    expect(autoRefreshTimer).toBeDefined();
    const refresh = autoRefreshTimer?.[0];
    if (typeof refresh !== "function") throw new Error("Auto-refresh timer callback was not registered");

    act(() => refresh());

    await waitFor(() => expect(serviceMocks.fetch).toHaveBeenCalledTimes(2));
    setIntervalSpy.mockRestore();
  });
});
