import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FacilityJoinClient } from "@/app/join/FacilityJoinClient";

const mocks = vi.hoisted(() => ({
  fetchPublicFacilityRegistration: vi.fn(),
  enrollInFacility: vi.fn(),
  hasPersistedPortalToken: vi.fn(),
  startFacilityRegistrationAuth: vi.fn(),
  prepareExplicitAuthRetry: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/join/",
  useSearchParams: () => new URLSearchParams("facility=chicago-heights"),
}));

vi.mock("@/lib/services/facilityOnboardingService", async () => {
  class FacilityRegistrationError extends Error {
    code = "FACILITY_REGISTRATION_FAILED";
    requestId = "";
    status = 0;
  }
  return {
    FacilityRegistrationError,
    fetchPublicFacilityRegistration: mocks.fetchPublicFacilityRegistration,
    enrollInFacility: mocks.enrollInFacility,
  };
});

vi.mock("@/lib/portalAuth", () => ({
  AuthRedirectError: class AuthRedirectError extends Error {},
  hasPersistedPortalToken: mocks.hasPersistedPortalToken,
  prepareExplicitAuthRetry: mocks.prepareExplicitAuthRetry,
  startFacilityRegistrationAuth: mocks.startFacilityRegistrationAuth,
}));

vi.mock("@/lib/publicBranding", () => ({
  publicBranding: {
    logoPath: "/logo.png",
    appName: "Inspection-Trac",
    appStoreUrl: "https://apps.example/inspection-trac",
    googlePlayUrl: "https://play.example/inspection-trac",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/join/?facility=chicago-heights");
  mocks.hasPersistedPortalToken.mockReturnValue(false);
  mocks.fetchPublicFacilityRegistration.mockResolvedValue({
    facilityName: "Chicago Heights",
    facilityLabel: "",
    organizationName: "Inspection-Trac",
    registrationEnabled: true,
    branding: {},
    support: { displayName: "Inspection-Trac Support", email: "support@inspection-trac.com" },
  });
  mocks.startFacilityRegistrationAuth.mockResolvedValue(undefined);
});

describe("FacilityJoinClient", () => {
  it("requires an email and passes it to Auth0 as the facility-registration identity hint", async () => {
    render(<FacilityJoinClient />);

    await screen.findByRole("heading", { name: "Join Chicago Heights" });
    const createButton = screen.getByRole("button", { name: "Create account" });
    expect(createButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Email address"), {
      target: { value: " Person@Example.com " },
    });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mocks.startFacilityRegistrationAuth).toHaveBeenCalledWith(
        "/join/?facility=chicago-heights",
        { email: "person@example.com", signup: true }
      );
    });
    expect(window.sessionStorage.getItem("inspection-trac.facility-registration-email.chicago-heights"))
      .toBe("person@example.com");
  });

  it("uses the stored email for idempotent enrollment after Auth0 returns", async () => {
    window.sessionStorage.setItem(
      "inspection-trac.facility-registration-email.chicago-heights",
      "person@example.com"
    );
    mocks.hasPersistedPortalToken.mockReturnValue(true);
    mocks.enrollInFacility.mockResolvedValue({
      success: true,
      organization: { name: "Inspection-Trac" },
      facility: { name: "Chicago Heights", slug: "chicago-heights" },
      role: { name: "User", key: "user" },
      onboardingStatus: "ready",
      missingFields: [],
      recommendedFields: ["first_name", "last_name"],
      issues: [],
      auth0: { status: "synced" },
    });

    render(<FacilityJoinClient />);

    await waitFor(() => {
      expect(mocks.enrollInFacility).toHaveBeenCalledWith(
        "chicago-heights",
        "person@example.com"
      );
    });
    expect(await screen.findByText("You’re set up for Chicago Heights.")).toBeInTheDocument();
    expect(screen.getByText(/does not block facility access/i)).toBeInTheDocument();
  });
});
