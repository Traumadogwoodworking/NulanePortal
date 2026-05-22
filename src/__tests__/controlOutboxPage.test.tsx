import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import ControlOutboxPage from "@/app/control/outbox/page";

const controlPlaneMocks = vi.hoisted(() => ({
  fetchAdminOutbox: vi.fn(),
  fetchAdminOutboxItem: vi.fn(),
  fetchAdminOutboxHistory: vi.fn(),
  retryAdminOutbox: vi.fn(),
  repairAdminOutbox: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/control/outbox",
}));

vi.mock("@/lib/portalSession", () => ({
  usePortalSession: () => ({
    organizationId: "org-1",
    session: { organization: { name: "Org 1" } },
    user: { display_name: "Operator", email: "operator@example.com" },
    isSuperAdmin: true,
    isOrgAdmin: false,
    isAdmin: true,
    selectedLocationLabel: null,
    hasPermission: () => true,
  }),
}));

vi.mock("@/lib/services/controlPlaneService", async () => {
  const actual = await vi.importActual<typeof import("@/lib/services/controlPlaneService")>(
    "@/lib/services/controlPlaneService",
  );
  return {
    ...actual,
    fetchAdminOutbox: controlPlaneMocks.fetchAdminOutbox,
    fetchAdminOutboxItem: controlPlaneMocks.fetchAdminOutboxItem,
    fetchAdminOutboxHistory: controlPlaneMocks.fetchAdminOutboxHistory,
    retryAdminOutbox: controlPlaneMocks.retryAdminOutbox,
    repairAdminOutbox: controlPlaneMocks.repairAdminOutbox,
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

function buildRow() {
  return {
    id: "outbox-1",
    organization_id: "org-1",
    template_key: "report_finalized",
    subject: "Report finalized",
    recipient_list: ["ops@example.com"],
    recipient_count: 1,
    recipients: ["ops@example.com"],
    status: "failed_retryable",
    attempt_count: 2,
    last_attempt_at: "2026-04-14T12:00:00Z",
    next_retry_at: "2026-04-14T12:30:00Z",
    last_error_code: "SMTP_TIMEOUT",
    last_error_message: "The upstream provider timed out.",
    last_error_retryable: true,
    created_at: "2026-04-14T11:30:00Z",
    updated_at: "2026-04-14T12:05:00Z",
    sent_at: null,
    source_record_type: "report",
    source_record_id: null,
    email_type: "report_finalized",
    payload_preview: {},
  };
}

describe("ControlOutboxPage", () => {
  it("shows queue state, disables repair without a linked report, and hides resend", async () => {
    controlPlaneMocks.fetchAdminOutbox.mockResolvedValue({
      items: [buildRow()],
      total: 1,
    });
    controlPlaneMocks.fetchAdminOutboxItem.mockResolvedValue(buildRow());
    controlPlaneMocks.fetchAdminOutboxHistory.mockResolvedValue([]);

    render(<ControlOutboxPage />);

    await waitFor(() => expect(screen.getByText("outbox-1")).toBeVisible());
    expect(screen.getByText("No linked report available")).toBeVisible();
    expect(screen.getByRole("button", { name: "Retry" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Repair" })).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Resend" })).toBeNull();
    expect(screen.getByText("No attempt history recorded yet.")).toBeVisible();
    expect(screen.getByText("Retry is available for retryable failures only. Repair is operator-only and requires a linked source record or report reference.")).toBeVisible();
  });
});
