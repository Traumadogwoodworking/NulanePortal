import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TwentyFourHourInspectionPage from "@/app/inspection/24-hour/page";
import type { TwentyFourHourInspectionResponse } from "@/lib/services/twentyFourHourInspectionService";

const serviceMocks = vi.hoisted(() => ({ fetch: vi.fn() }));

vi.mock("@/lib/services/twentyFourHourInspectionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/services/twentyFourHourInspectionService")>();
  return { ...actual, fetchTwentyFourHourInspectionDisplay: serviceMocks.fetch };
});

vi.mock("@/lib/portalSession", () => ({
  usePortalSession: () => ({ isShap: true, status: "success" }),
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
        inspected_at: "2026-07-19T10:00:00.000Z", report_id: "report-inspected-1", facility: "SHAP", location: "SHAP/SHAP/B07",
      },
    ],
    warnings: [],
  };
}

describe("24-hour inspection page", () => {
  beforeEach(() => serviceMocks.fetch.mockReset());

  it("renders snapshot metadata, Overdue, normalized bays, and pinned controls", async () => {
    serviceMocks.fetch.mockResolvedValue(response());
    render(<TwentyFourHourInspectionPage />);
    expect(await screen.findByText("Overdue · 1h 0m")).toHaveStyle({ backgroundColor: "#000000", color: "#ffffff" });
    expect(screen.getByText("A12")).toBeInTheDocument();
    expect(screen.queryByText("SHAP/SHAP/A12")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Development snapshot diagnostics")).toHaveTextContent("excluded: 1");
    expect(screen.getByLabelText("Development snapshot diagnostics")).toHaveTextContent("request: request-1");
    expect(screen.getByLabelText("Search inspected and uninspected records").parentElement?.parentElement).toHaveClass("sticky", "top-0", "z-30");
    expect(screen.getByRole("columnheader", { name: "VIN" }).closest("thead")).toHaveClass("sticky", "z-20");
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
    expect(screen.getByLabelText("Development snapshot diagnostics")).toHaveTextContent("request-new");
  });
});
