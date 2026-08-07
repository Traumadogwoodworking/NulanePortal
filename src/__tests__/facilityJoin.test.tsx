import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FacilityJoinClient } from "@/app/join/FacilityJoinClient";

const mocks = vi.hoisted(() => ({
  query: "facility=chicago-heights",
  createFacilityEnrollmentSession: vi.fn(),
  fetchFacilityEnrollmentSession: vi.fn(),
  submitFacilityEnrollmentEmail: vi.fn(),
  recordFacilityEnrollmentEvent: vi.fn(),
  enrollInFacility: vi.fn(),
  hasPersistedPortalToken: vi.fn(),
  startFacilityRegistrationAuth: vi.fn(),
  prepareExplicitAuthRetry: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/join/",
  useSearchParams: () => new URLSearchParams(mocks.query),
}));

vi.mock("@/lib/services/facilityOnboardingService", async () => {
  class FacilityRegistrationError extends Error {
    code = "FACILITY_REGISTRATION_FAILED";
    requestId = "";
    status = 0;
  }
  return {
    FacilityRegistrationError,
    createFacilityEnrollmentSession: mocks.createFacilityEnrollmentSession,
    fetchFacilityEnrollmentSession: mocks.fetchFacilityEnrollmentSession,
    submitFacilityEnrollmentEmail: mocks.submitFacilityEnrollmentEmail,
    recordFacilityEnrollmentEvent: mocks.recordFacilityEnrollmentEvent,
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

function session(overrides = {}) {
  return {
    enrollmentToken: "opaque-enrollment-token-12345678901234567890",
    status: "started",
    expiresAt: "2099-01-01T00:00:00.000Z",
    completedAt: null,
    failureCode: "",
    organizationName: "Inspection-Trac",
    facilityName: "Chicago Heights",
    facilityLabel: "",
    registrationEnabled: true,
    roleName: "User",
    support: { displayName: "Inspection-Trac Support", email: "support@inspection-trac.com" },
    stores: {},
    branding: {},
    packetRevision: 1,
    restartUrl: "https://inspection-trac.com/join/?facility=chicago-heights",
    emailEntered: false,
    enrollmentResult: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query = "facility=chicago-heights";
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/join/?facility=chicago-heights");
  mocks.hasPersistedPortalToken.mockReturnValue(false);
  mocks.createFacilityEnrollmentSession.mockResolvedValue(session());
  mocks.submitFacilityEnrollmentEmail.mockResolvedValue(session({ status: "email_entered", emailEntered: true }));
  mocks.recordFacilityEnrollmentEvent.mockResolvedValue(undefined);
  mocks.startFacilityRegistrationAuth.mockResolvedValue(undefined);
});

describe("FacilityJoinClient", () => {
  it("creates an opaque session, binds the email server-side, and returns Auth0 only to that session", async () => {
    render(<FacilityJoinClient />);

    await screen.findByRole("heading", { name: "Join Chicago Heights" });
    expect(mocks.createFacilityEnrollmentSession).toHaveBeenCalledWith("chicago-heights", "facility_qr");
    expect(window.location.search).toContain("enrollment=opaque-enrollment-token");
    expect(window.location.search).not.toContain("facility=chicago-heights");

    const createButton = screen.getByRole("button", { name: "Create account" });
    expect(createButton).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: " Person@Example.com " } });
    fireEvent.click(createButton);

    await waitFor(() => {
      expect(mocks.submitFacilityEnrollmentEmail).toHaveBeenCalledWith(
        "opaque-enrollment-token-12345678901234567890",
        "person@example.com"
      );
      expect(mocks.startFacilityRegistrationAuth).toHaveBeenCalledWith(
        "/join/?enrollment=opaque-enrollment-token-12345678901234567890",
        { email: "person@example.com", signup: true }
      );
    });
    expect(window.sessionStorage.length).toBe(0);
  });

  it("restores the opaque session and idempotently enrolls after Auth0 returns", async () => {
    mocks.query = "enrollment=opaque-enrollment-token-12345678901234567890";
    mocks.hasPersistedPortalToken.mockReturnValue(true);
    mocks.fetchFacilityEnrollmentSession.mockResolvedValue(session({ status: "auth_started", emailEntered: true }));
    mocks.enrollInFacility.mockResolvedValue({
      success: true,
      organization: { name: "Inspection-Trac" },
      facility: { name: "Chicago Heights", slug: "chicago-heights" },
      role: { name: "User", key: "user" },
      onboardingStatus: "ready",
      missingFields: [],
      recommendedFields: ["first_name", "last_name"],
      issues: [],
      alreadyMember: false,
      signedInEmail: "person@example.com",
      auth0: { status: "identity_only" },
    });

    render(<FacilityJoinClient />);

    await waitFor(() => {
      expect(mocks.fetchFacilityEnrollmentSession).toHaveBeenCalledWith("opaque-enrollment-token-12345678901234567890");
      expect(mocks.enrollInFacility).toHaveBeenCalledWith("opaque-enrollment-token-12345678901234567890");
    });
    expect(await screen.findByText("You’re set up for Chicago Heights.")).toBeInTheDocument();
    expect(screen.getByText("Signed in as person@example.com")).toBeInTheDocument();
    expect(screen.getByText(/does not block facility access/i)).toBeInTheDocument();
  });
});
