import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFINIAN_ANDROID_APP_URL,
  DEFINIAN_IOS_APP_URL,
  DEFINIAN_SIGNAL_RETURN_URL,
  DefinianStartClient,
} from "@/app/definian/start/DefinianStartClient";

const authMocks = vi.hoisted(() => ({
  startFacilityRegistrationAuth: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/portalAuth", () => ({
  AuthRedirectError: class AuthRedirectError extends Error {},
  resolveSafePortalReturnTo: vi.fn((value: string) => value),
  startFacilityRegistrationAuth: authMocks.startFacilityRegistrationAuth,
}));

vi.mock("@/lib/publicBranding", () => ({
  publicBranding: {
    logoPath: "/logo.png",
    appName: "Definian Inspection",
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.startFacilityRegistrationAuth.mockResolvedValue(undefined);
});

describe("Definian onboarding start page", () => {
  it("renders the proven email-first registration experience and verified app links", () => {
    render(<DefinianStartClient />);

    expect(screen.getByRole("heading", { name: "Get Started with Definian" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Secure your account" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Getting started" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create account" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeDisabled();
    expect(screen.getByRole("link", { name: /Install for iPhone/ })).toHaveAttribute("href", DEFINIAN_IOS_APP_URL);
    expect(screen.getByRole("link", { name: /Install for Android/ })).toHaveAttribute("href", DEFINIAN_ANDROID_APP_URL);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it.each([
    ["Create account", true],
    ["Sign in", false],
  ])("starts Definian Auth0 from the %s action with the normalized email", async (buttonName, signup) => {
    render(<DefinianStartClient />);
    fireEvent.change(screen.getByLabelText("Email address"), { target: { value: " Person@Example.com " } });
    fireEvent.click(screen.getByRole("button", { name: buttonName }));

    await waitFor(() => {
      expect(authMocks.startFacilityRegistrationAuth).toHaveBeenCalledWith(
        DEFINIAN_SIGNAL_RETURN_URL,
        { email: "person@example.com", signup },
      );
    });
  });
});
