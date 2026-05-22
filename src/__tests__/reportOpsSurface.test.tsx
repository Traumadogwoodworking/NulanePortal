import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ReportOpsSurface } from "@/components/report-ops/ReportOpsSurface";

const reportOpsMocks = vi.hoisted(() => ({
  loadReportOpsContext: vi.fn(),
  fetchReportOpsReportStatus: vi.fn(),
  fetchReportOpsOutboxHistory: vi.fn(),
  repairReport: vi.fn(),
  quarantineReport: vi.fn(),
  unquarantineReport: vi.fn(),
  refreshReportState: vi.fn(),
}));

vi.mock("@/lib/portalSession", () => ({
  usePortalSession: () => ({
    organizationId: "org-1",
  }),
}));

vi.mock("@/lib/services/reportOpsService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/reportOpsService")>(
    "@/lib/services/reportOpsService",
  );
  return {
    ...actual,
    loadReportOpsContext: reportOpsMocks.loadReportOpsContext,
    fetchReportOpsReportStatus: reportOpsMocks.fetchReportOpsReportStatus,
    fetchReportOpsOutboxHistory: reportOpsMocks.fetchReportOpsOutboxHistory,
    repairReport: reportOpsMocks.repairReport,
    quarantineReport: reportOpsMocks.quarantineReport,
    unquarantineReport: reportOpsMocks.unquarantineReport,
    refreshReportState: reportOpsMocks.refreshReportState,
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

function buildReport({
  lifecycleState = "artifact_pending",
  quarantineFlag = false,
  status = "processing",
}: {
  lifecycleState?: string;
  quarantineFlag?: boolean;
  status?: string;
} = {}) {
  return {
    report_id: "report-1",
    organization_id: "org-1",
    user_uuid: "user-1",
    vin: "1HGBH41JXMN109186",
    make: "Tesla",
    model: "Model 3",
    year: 2025,
    status,
    inspector_email: "inspector@example.com",
    comments: "Operator note",
    splat_urls: [],
    pdf_url: "",
    created_at: "2026-04-14T12:00:00Z",
    updated_at: "2026-04-14T12:00:00Z",
    overview: {
      report_id: "report-1",
      comments: "Operator note",
      pdf_url: "",
      bay_location: "Bay 7",
      navigation: "Line up at Bay 7",
      metadata: {},
      created_at: "2026-04-14T12:00:00Z",
      updated_at: "2026-04-14T12:00:00Z",
    },
    damage_entries: [
      {
        damage_entry_id: "damage-1",
        damage_sequence: 1,
        damage_area: "front",
        damage_type: "scratch",
        damage_area_code: "F",
        damage_type_code: "SCR",
        severity: "1",
        comments: "Scratch on bumper",
        photos: [],
        created_at: "2026-04-14T12:00:00Z",
        updated_at: "2026-04-14T12:00:00Z",
      },
    ],
    location: {
      report_id: "report-1",
      latitude: 12.34,
      longitude: 56.78,
      accuracy: 3,
      altitude: 20,
      address: "123 Dock St",
      is_last_known: true,
      location_timestamp: "2026-04-14T12:00:00Z",
      created_at: "2026-04-14T12:00:00Z",
      updated_at: "2026-04-14T12:00:00Z",
    },
    metadata: quarantineFlag
      ? {
          quarantined: true,
          lifecycle_state: "quarantined",
          exact_blocker: "Marked for investigation",
          recommended_action: "Review the quarantined row and decide whether to repair",
        }
      : {
          lifecycle_state: lifecycleState,
          exact_blocker: "Finalization is waiting on report artifacts",
          recommended_action: "Wait for artifact finalization and refresh state",
        },
  };
}

function buildOutbox({
  status = "queued",
  sentAt = null,
  retryable = false,
}: {
  status?: string;
  sentAt?: string | null;
  retryable?: boolean;
} = {}) {
  return {
    id: "outbox-1",
    organization_id: "org-1",
    template_key: "report_finalized",
    subject: "Report finalized",
    recipient_list: ["ops@example.com"],
    recipient_count: 1,
    recipients: ["ops@example.com"],
    status,
    attempt_count: 0,
    last_attempt_at: null,
    next_retry_at: null,
    last_error_code: null,
    last_error_message: null,
    last_error_retryable: retryable,
    created_at: "2026-04-14T12:00:00Z",
    updated_at: "2026-04-14T12:00:00Z",
    sent_at: sentAt,
    source_record_type: "report",
    source_record_id: "report-1",
    email_type: "report_finalized",
    payload_preview: { report_id: "report-1" },
  };
}

function setupReportOpsMocks({
  report = buildReport(),
  outbox = buildOutbox(),
  status = {
    status: "processing",
    expected_media_count: 1,
    received_media_count: 1,
    pdf_present: true,
    checksums_match: true,
    manifest: {
      expected_media_count: 1,
      received_media_count: 1,
      pdf_required: true,
      pdf_present: true,
      checksum_expected: null,
      checksum_verified: null,
      finalized_at: null,
    },
  },
  repairResponse = null,
  quarantineResponse = null,
  unquarantineResponse = null,
  refreshResponse = null,
  statusSequence = null,
}: {
  report?: ReturnType<typeof buildReport>;
  outbox?: ReturnType<typeof buildOutbox> | null;
  status?: Record<string, unknown>;
  repairResponse?: unknown;
  quarantineResponse?: unknown;
  unquarantineResponse?: unknown;
  refreshResponse?: unknown;
  statusSequence?: Array<Record<string, unknown>> | null;
} = {}) {
  reportOpsMocks.loadReportOpsContext.mockResolvedValue({
    summary: {
      recentActivity: [],
      totalSubmissions: 1,
      pending: 1,
      completed: 0,
      issues: 0,
    },
    reports: [report],
    outboxRows: outbox ? [outbox] : [],
  });
  const statuses = Array.isArray(statusSequence) && statusSequence.length ? [...statusSequence] : [status];
  reportOpsMocks.fetchReportOpsReportStatus.mockImplementation(async () => {
    if (statuses.length > 1) {
      return statuses.shift();
    }
    return statuses[0];
  });
  reportOpsMocks.fetchReportOpsOutboxHistory.mockResolvedValue([]);
  reportOpsMocks.repairReport.mockResolvedValue(repairResponse);
  reportOpsMocks.quarantineReport.mockResolvedValue(quarantineResponse);
  reportOpsMocks.unquarantineReport.mockResolvedValue(unquarantineResponse);
  reportOpsMocks.refreshReportState.mockResolvedValue(refreshResponse);
}

describe("ReportOpsSurface actions", () => {
  it("repairs a report and updates the row and drawer state", async () => {
    setupReportOpsMocks({
      report: buildReport({ lifecycleState: "artifact_pending", status: "processing" }),
      outbox: buildOutbox({ status: "queued" }),
      statusSequence: [
        {
          status: "processing",
          expected_media_count: 1,
          received_media_count: 1,
          pdf_present: true,
          checksums_match: true,
          manifest: {
            expected_media_count: 1,
            received_media_count: 1,
            pdf_required: true,
            pdf_present: true,
            checksum_expected: null,
            checksum_verified: null,
            finalized_at: null,
          },
        },
        {
          status: "complete",
          expected_media_count: 1,
          received_media_count: 1,
          pdf_present: true,
          checksums_match: true,
          manifest: {
            expected_media_count: 1,
            received_media_count: 1,
            pdf_required: true,
            pdf_present: true,
            checksum_expected: null,
            checksum_verified: true,
            finalized_at: "2026-04-14T12:10:00Z",
          },
        },
      ],
      repairResponse: {
        report: buildReport({ lifecycleState: "complete_but_unsent", status: "complete" }),
        status: {
          status: "complete",
          expected_media_count: 1,
          received_media_count: 1,
          pdf_present: true,
          checksums_match: true,
          manifest: {
            expected_media_count: 1,
            received_media_count: 1,
            pdf_required: true,
            pdf_present: true,
            checksum_expected: null,
            checksum_verified: true,
            finalized_at: "2026-04-14T12:10:00Z",
          },
        },
        outbox: buildOutbox({ status: "queued" }),
        lifecycle_state: "complete_but_unsent",
        outbox_state: "pending",
        exact_blocker: "Manifest finalized but no sent outbox row",
        retryable: false,
        quarantined: false,
        recommended_action: "Refresh state and resend if necessary",
      },
    });

    render(<ReportOpsSurface />);

    await screen.findByRole("button", { name: /repair \/ reconcile/i });
    fireEvent.click(screen.getByRole("button", { name: /repair \/ reconcile/i }));

    await waitFor(() => {
      expect(reportOpsMocks.repairReport).toHaveBeenCalledWith(
        "report-1",
        "org-1",
        "Operator repair from report operations surface",
      );
    });
    await screen.findByText("Complete / unsent");
    expect(screen.getByText("Report repaired")).toBeInTheDocument();
  });

  it("quarantines and unquarantines the selected report", async () => {
    setupReportOpsMocks({
      report: buildReport({ lifecycleState: "complete_but_unsent", status: "complete" }),
      outbox: buildOutbox({ status: "queued" }),
      status: {
        status: "complete",
        expected_media_count: 1,
        received_media_count: 1,
        pdf_present: true,
        checksums_match: true,
        manifest: {
          expected_media_count: 1,
          received_media_count: 1,
          pdf_required: true,
          pdf_present: true,
          checksum_expected: null,
          checksum_verified: true,
          finalized_at: "2026-04-14T12:04:00Z",
        },
      },
      quarantineResponse: {
        report: buildReport({
          lifecycleState: "quarantined",
          quarantineFlag: true,
          status: "complete",
        }),
        status: {
          status: "complete",
          expected_media_count: 1,
          received_media_count: 1,
          pdf_present: true,
          checksums_match: true,
          manifest: {
            expected_media_count: 1,
            received_media_count: 1,
            pdf_required: true,
            pdf_present: true,
            checksum_expected: null,
            checksum_verified: true,
            finalized_at: "2026-04-14T12:10:00Z",
          },
        },
        outbox: buildOutbox({ status: "queued" }),
        lifecycle_state: "quarantined",
        outbox_state: "pending",
        exact_blocker: "Marked for investigation",
        retryable: false,
        quarantined: true,
        recommended_action: "Review the quarantined row and decide whether to repair",
      },
      unquarantineResponse: {
        report: buildReport({ lifecycleState: "complete_but_unsent", status: "complete" }),
        status: {
          status: "complete",
          expected_media_count: 1,
          received_media_count: 1,
          pdf_present: true,
          checksums_match: true,
          manifest: {
            expected_media_count: 1,
            received_media_count: 1,
            pdf_required: true,
            pdf_present: true,
            checksum_expected: null,
            checksum_verified: true,
            finalized_at: "2026-04-14T12:10:00Z",
          },
        },
        outbox: buildOutbox({ status: "queued" }),
        lifecycle_state: "complete_but_unsent",
        outbox_state: "pending",
        exact_blocker: "Manifest finalized but no sent outbox row",
        retryable: false,
        quarantined: false,
        recommended_action: "Refresh state and resend if necessary",
      },
    });
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<ReportOpsSurface />);

    await screen.findByRole("button", { name: /^Quarantine$/i });
    fireEvent.click(screen.getByRole("button", { name: /^Quarantine$/i }));

    await waitFor(() => {
      expect(reportOpsMocks.quarantineReport).toHaveBeenCalledWith(
        "report-1",
        "org-1",
        "Operator quarantine from report operations surface",
      );
    });
    await screen.findByRole("button", { name: /^Unquarantine$/i });
    expect(screen.getByText("Quarantined")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Unquarantine$/i }));

    await waitFor(() => {
      expect(reportOpsMocks.unquarantineReport).toHaveBeenCalledWith(
        "report-1",
        "org-1",
        "Operator unquarantine from report operations surface",
      );
    });
    await screen.findByRole("button", { name: /^Quarantine$/i });
    expect(screen.getByText("Complete / unsent")).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it("shows a useful toast when refresh fails", async () => {
    setupReportOpsMocks({
      report: buildReport({ lifecycleState: "artifact_pending", status: "processing" }),
      outbox: buildOutbox({ status: "queued" }),
    });
    reportOpsMocks.refreshReportState.mockRejectedValueOnce(new Error("backend unavailable"));
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<ReportOpsSurface />);

    await screen.findByRole("button", { name: /refresh state/i });
    fireEvent.click(screen.getByRole("button", { name: /refresh state/i }));

    await screen.findByText("Refresh failed");
    expect(screen.getByText("backend unavailable")).toBeInTheDocument();
    confirmSpy.mockRestore();
  });
});
