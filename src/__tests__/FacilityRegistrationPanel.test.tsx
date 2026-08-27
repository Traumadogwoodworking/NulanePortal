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
    organizationId: "org-example",
    organizationName: "Example Organization",
    facilityId: "facility-example",
    facilityName: "Example Facility",
    facilityLabel: "Example Facility",
    slug: "example-facility",
    enabled: true,
    available: true,
    defaultRoleId: "role-user",
    defaultRoleKey: "user",
    defaultRoleName: "User",
    registrationUrl:
      "https://portal.example/join/?facility=example-facility",
    onboardingDisplayName: "Example Facility",
    support: {
      displayName: "DocuDent Support",
      email: "support@nulanesystems.com",
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
  it("uses the backend canonical DocuDent link without a customer packet", async () => {
    render(
      <FacilityRegistrationPanel
        organizationId="org-example"
        organizationName="Example Organization"
        facilityId="facility-example"
        facilityName="Example Facility"
        canManage
      />,
    );

    expect(await screen.findByText("Registration enabled")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Quick Start PDF/i })).not.toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Open registration link" }),
    ).toHaveAttribute(
      "href",
      "https://portal.example/join/?facility=example-facility",
    );
    await waitFor(() =>
      expect(mocks.toDataURL).toHaveBeenCalledWith(
        "https://portal.example/join/?facility=example-facility",
        expect.any(Object),
      ),
    );
    expect(screen.getByText("Registration link name")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(
      /Auth0|short-lived session|registration slug|Inspection[- ]Trac|AWCT|JNAP|SHAP/i,
    );
  });
});
