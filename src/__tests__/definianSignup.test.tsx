import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignupRedirectClient } from "@/app/signup/SignupRedirectClient";
import { DefinianQuickStart } from "@/components/definian/DefinianQuickStart";
import { publicBranding } from "@/lib/publicBranding";

const authMocks = vi.hoisted(() => ({
  startAuth0Signup: vi.fn(),
  isEmbeddedPortalContext: vi.fn(() => false),
  openPortalSignup: vi.fn(),
  resolveSafePortalReturnTo: vi.fn((value?: string | null) => value || "/home/"),
  AuthRedirectError: class AuthRedirectError extends Error {},
}));

vi.mock("@/lib/portalAuth", () => authMocks);

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.isEmbeddedPortalContext.mockReturnValue(false);
  authMocks.resolveSafePortalReturnTo.mockImplementation((value?: string | null) => value || "/home/");
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

  it("uses the published Definian Inspection store listings", () => {
    expect(publicBranding.appStoreUrl).toBe("https://apps.apple.com/us/app/definian-inspection/id6778651028");
    expect(publicBranding.googlePlayUrl).toBe("https://play.google.com/store/apps/details?id=com.nulanesystems.definian");
  });

  it("renders a Definian-only quick start with both verified store links", () => {
    render(<DefinianQuickStart embedded />);

    expect(screen.getByRole("heading", { name: "Definian Inspection quick start" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Install Definian for iPhone or iPad" })).toHaveAttribute(
      "href",
      "https://apps.apple.com/us/app/inspection-trac/id6774376762",
    );
    expect(screen.getByRole("link", { name: "Install Definian for Android" })).toHaveAttribute(
      "href",
      "https://play.google.com/store/apps/details?id=com.nulanesystems.inspectiontrac",
    );
    expect(screen.getByRole("link", { name: "Download printable quick-start PDF" })).toHaveAttribute(
      "href",
      "/resources/definian/definian-inspection-quick-start.pdf?v=6",
    );
    expect(document.body).not.toHaveTextContent(/Inspection-Trac/i);
  });
});
