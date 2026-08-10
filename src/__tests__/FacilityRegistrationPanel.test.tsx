import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FacilityRegistrationPanel } from "@/components/facilities/FacilityRegistrationPanel";

const mocks = vi.hoisted(() => ({
  fetchFacilityRegistration: vi.fn(),
  updateFacilityRegistration: vi.fn(),
  getRoles: vi.fn(),
  toDataURL: vi.fn(async () => "data:image/png;base64,cXI="),
  toString: vi.fn(async () => "<svg></svg>"),
}));

vi.mock("qrcode", () => ({
  default: {
    toDataURL: mocks.toDataURL,
    toString: mocks.toString,
  },
}));

vi.mock("@/lib/services/facilityOnboardingService", () => ({
  fetchFacilityRegistration: mocks.fetchFacilityRegistration,
  updateFacilityRegistration: mocks.updateFacilityRegistration,
}));

vi.mock("@/lib/services/usersService", () => ({
  UsersAdapter: { getRoles: mocks.getRoles },
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getRoles.mockResolvedValue([]);
  mocks.fetchFacilityRegistration.mockResolvedValue({
    organizationId: "org-awct",
    organizationName: "Inspection-Trac",
    facilityId: "6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c",
    facilityName: "Chicago Heights",
    facilityLabel: "Chicago Heights",
    slug: "chicago-heights",
    enabled: true,
    available: true,
    defaultRoleId: "role-user",
    defaultRoleKey: "user",
    defaultRoleName: "User",
    registrationUrl:
      "https://inspection-trac.com/join/?facility=chicago-heights",
    onboardingDisplayName: "Chicago Heights",
    support: {
      displayName: "Inspection-Trac Support",
      email: "support@inspection-trac.com",
    },
    stores: {},
    packetRevision: 2,
    packetUpdatedAt: null,
    lastSuccessfulEnrollment: null,
    recentEnrollments: [],
    globalEnabled: true,
    updatedAt: null,
  });
});

describe("FacilityRegistrationPanel", () => {
  it("uses the same canonical Chicago link, QR, and published PDF as Resources", async () => {
    render(
      <FacilityRegistrationPanel
        organizationId="org-awct"
        organizationName="Inspection-Trac"
        facilityId="6bb06327-37de-4d1c-9e7d-1c4c4e19dc1c"
        facilityName="Chicago Heights"
        canManage
      />,
    );

    expect(
      await screen.findByRole("link", {
        name: "Open Chicago Heights Quick Start PDF",
      }),
    ).toHaveAttribute(
      "href",
      "/resources/chicago-heights/chicago-heights-quick-start.pdf",
    );
    expect(
      screen.getByRole("link", { name: "Open registration link" }),
    ).toHaveAttribute(
      "href",
      "https://inspection-trac.com/join/chicago-heights",
    );
    await waitFor(() =>
      expect(mocks.toDataURL).toHaveBeenCalledWith(
        "https://inspection-trac.com/join/chicago-heights",
        expect.any(Object),
      ),
    );
    expect(screen.getByText("Registration link name")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /Auth0|short-lived session|registration slug/i,
    );
  });
});
