import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignupRedirectClient } from "@/app/signup/SignupRedirectClient";
import { publicBranding } from "@/lib/publicBranding";

const authMocks = vi.hoisted(() => ({
  startAuth0Signup: vi.fn(),
  AuthRedirectError: class AuthRedirectError extends Error {},
}));

vi.mock("@/lib/portalAuth", () => authMocks);

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.startAuth0Signup.mockRejectedValue(new authMocks.AuthRedirectError());
});

describe("Definian signup quick start", () => {
  it("opens Auth0 signup for the Definian home destination", async () => {
    render(<SignupRedirectClient />);

    await waitFor(() => {
      expect(authMocks.startAuth0Signup).toHaveBeenCalledWith("/home/");
    });
    expect(screen.getByRole("heading", { name: "Join Definian Inspection" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Definian account" })).toBeInTheDocument();
  });

  it("uses the published Inspection-Trac store listings", () => {
    expect(publicBranding.appStoreUrl).toBe("https://apps.apple.com/us/app/inspection-trac/id6774376762");
    expect(publicBranding.googlePlayUrl).toBe("https://play.google.com/store/apps/details?id=com.nulanesystems.inspectiontrac");
  });
});
