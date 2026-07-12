import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RsaReportsManager } from "@/components/reports/RsaReportsManager";
import type { RsaReportApiRow } from "@/lib/types";

const portalDataMocks = vi.hoisted(() => ({
  snapshot: {
    data: {
      damageReports: [],
      rsaReports: [] as RsaReportApiRow[],
      partialError: null as string | null,
    },
    mutate: vi.fn(),
    isLoading: false,
    isValidating: false,
  },
}));

vi.mock("@/lib/portalData", () => ({
  usePortalReportsSnapshot: () => portalDataMocks.snapshot,
}));

vi.mock("@/lib/portalSession", () => ({
  usePortalSession: () => ({
    session: {
      organization: {
        name: "American Wheel & Car",
      },
    },
  }),
}));

vi.mock("@/lib/apiClient", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("file-saver", () => ({
  saveAs: vi.fn(),
}));

describe("RsaReportsManager", () => {
  beforeEach(() => {
    portalDataMocks.snapshot.data = {
      damageReports: [],
      partialError: null,
      rsaReports: [
        {
          report_id: "rsa-1",
          subject: "First railcar check",
          inspector_email: "ops-one@example.com",
          track: "A",
          spot: "12",
          facility: "Western Hub",
          created_at: "2026-07-02T10:00:00.000Z",
          cars: [
            {
              railCarNumber: "RC-1001",
              spot: "12",
              decks: {
                A: [{ vin: "VIN-A" }],
              },
            },
            {
              railCarNumber: "RC-2002",
              spot: "12",
              decks: {
                A: [{ vin: "VIN-C" }],
              },
            },
          ],
        },
        {
          report_id: "rsa-2",
          subject: "Second railcar check",
          inspector_email: "ops-two@example.com",
          track: "A",
          spot: "12",
          facility: "Western Hub",
          created_at: "2026-07-02T11:00:00.000Z",
          cars: [
            {
              rail_car_number: " rc-1001 ",
              spot: "12",
              decks: {
                A: [{ vin: "VIN-A" }],
                B: [{ vin: "VIN-B" }],
              },
            },
          ],
        },
        {
          report_id: "rsa-3",
          subject: "B deck only",
          inspector_email: "ops-three@example.com",
          track: "A",
          spot: "14",
          facility: "Western Hub",
          created_at: "2026-07-02T12:00:00.000Z",
          cars: [
            {
              railCarNumber: "RC-3003",
              spot: "14",
              decks: {
                B: [{ vin: "VIN-D" }],
              },
            },
          ],
        },
        {
          report_id: "rsa-4",
          subject: "Both decks with empty B",
          inspector_email: "ops-four@example.com",
          track: "A",
          spot: "15",
          facility: "Western Hub",
          created_at: "2026-07-02T13:00:00.000Z",
          cars: [
            {
              railCarNumber: "RC-4004",
              spot: "15",
              decks: {
                A: [{ vin: "VIN-E" }],
                B: [],
              },
            },
          ],
        },
        {
          report_id: "rsa-hidden-track",
          subject: "Hidden blank track",
          inspector_email: "ops-hidden@example.com",
          track: "",
          spot: "16",
          facility: "Western Hub",
          created_at: "2026-07-02T14:00:00.000Z",
          cars: [
            {
              railCarNumber: "RC-HIDDEN-TRACK",
              spot: "16",
              decks: {
                A: [{ vin: "VIN-HIDDEN-TRACK" }],
              },
            },
          ],
        },
        {
          report_id: "rsa-hidden-spot",
          subject: "Hidden unassigned spot",
          inspector_email: "ops-hidden@example.com",
          track: "A",
          spot: "Unassigned",
          facility: "Western Hub",
          created_at: "2026-07-02T15:00:00.000Z",
          cars: [
            {
              railCarNumber: "RC-HIDDEN-SPOT",
              spot: "Unassigned",
              decks: {
                B: [{ vin: "VIN-HIDDEN-SPOT" }],
              },
            },
          ],
        },
      ],
    };
    portalDataMocks.snapshot.mutate.mockReset();
    portalDataMocks.snapshot.isLoading = false;
    portalDataMocks.snapshot.isValidating = false;
  });

  it("merges matching railcar rows and scopes the side panel to the clicked railcar", async () => {
    const user = userEvent.setup();
    render(<RsaReportsManager />);

    expect(screen.getByText("4 railcars")).toBeInTheDocument();
    expect(screen.getAllByText("RC-1001")).toHaveLength(1);
    expect(screen.getByText("Deck A")).toBeInTheDocument();
    expect(screen.getByText("Deck B")).toBeInTheDocument();
    expect(screen.getAllByText("Deck A+B")).toHaveLength(2);
    expect(screen.queryByText("RC-HIDDEN-TRACK")).not.toBeInTheDocument();
    expect(screen.queryByText("RC-HIDDEN-SPOT")).not.toBeInTheDocument();
    expect(screen.queryByText(/submissions/i)).not.toBeInTheDocument();

    await user.click(screen.getByText("RC-1001"));

    expect(await screen.findByText("Railcar RC-1001")).toBeInTheDocument();
    expect(screen.getAllByText("Deck A").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Deck B").length).toBeGreaterThan(0);
    expect(screen.getByText("VIN-A")).toBeInTheDocument();
    expect(screen.getByText("VIN-B")).toBeInTheDocument();
    expect(screen.getAllByText("VIN-A")).toHaveLength(1);
    expect(screen.getAllByText("RC-2002")).toHaveLength(1);
    expect(screen.queryByText(/submissions/i)).not.toBeInTheDocument();
  });

  it("keeps empty deck cards visible in the side panel for the clicked railcar", async () => {
    const user = userEvent.setup();
    render(<RsaReportsManager />);

    await user.click(screen.getByText("RC-4004"));

    expect(await screen.findByText("Railcar RC-4004")).toBeInTheDocument();
    expect(screen.getByText("VIN-E")).toBeInTheDocument();
    expect(screen.getByText("No VINs on this deck.")).toBeInTheDocument();
    expect(screen.queryByText(/submissions/i)).not.toBeInTheDocument();
  });
});
