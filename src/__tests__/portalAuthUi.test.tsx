import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { ReactNode } from "react";
import { PortalLayoutShell } from "@/components/PortalLayoutShell";
import { AuthCallbackClient } from "@/app/auth/callback/AuthCallbackClient";
import type { PortalSessionResponse } from "@/lib/types";

const portalSessionMocks = vi.hoisted(() => ({
  state: {
    status: "unauthenticated",
    error: null as Error | null,
    session: null as PortalSessionResponse | null,
  },
  refetch: vi.fn(),
}));

const portalAuthMocks = vi.hoisted(() => ({
  AuthRedirectError: class AuthRedirectError extends Error {
    constructor(message = "Redirecting to identity provider") {
      super(message);
      this.name = "AuthRedirectError";
    }
  },
  buildPortalLoginUrl: vi.fn((returnTo?: string) => `/login?returnTo=${encodeURIComponent(returnTo ?? "/")}`),
  cleanAuthCallbackUrl: vi.fn(() => window.history.replaceState({}, "", "/auth/callback/")),
  clearPortalAuthStorage: vi.fn(),
  completeAuth0Callback: vi.fn(() => new Promise<string>(() => {})),
  hasPersistedPortalToken: vi.fn(() => false),
  logAuthFlow: vi.fn(),
  logoutRejectedPortalSession: vi.fn(),
  prepareExplicitAuthRetry: vi.fn(),
  readStoredPortalLoginReturnTo: vi.fn(() => "/join/?enrollment=opaque-session-token"),
  startAuth0Login: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/home/",
}));

vi.mock("@/lib/portalSession", () => ({
  usePortalSession: () => ({
    status: portalSessionMocks.state.status,
    error: portalSessionMocks.state.error,
    session: portalSessionMocks.state.session,
    refetch: portalSessionMocks.refetch,
  }),
}));

vi.mock("@/lib/portalAuth", () => ({
  AuthRedirectError: portalAuthMocks.AuthRedirectError,
  buildPortalLoginUrl: portalAuthMocks.buildPortalLoginUrl,
  cleanAuthCallbackUrl: portalAuthMocks.cleanAuthCallbackUrl,
  clearPortalAuthStorage: portalAuthMocks.clearPortalAuthStorage,
  completeAuth0Callback: portalAuthMocks.completeAuth0Callback,
  hasPersistedPortalToken: portalAuthMocks.hasPersistedPortalToken,
  logAuthFlow: portalAuthMocks.logAuthFlow,
  logoutRejectedPortalSession: portalAuthMocks.logoutRejectedPortalSession,
  prepareExplicitAuthRetry: portalAuthMocks.prepareExplicitAuthRetry,
  readStoredPortalLoginReturnTo: portalAuthMocks.readStoredPortalLoginReturnTo,
  startAuth0Login: portalAuthMocks.startAuth0Login,
}));

vi.mock("@/lib/portalData", () => ({
  usePortalBrandingSnapshot: () => ({ data: null }),
}));

vi.mock("@/components/PortalSidebar", () => ({
  PortalSidebar: () => null,
}));

vi.mock("@/components/AccessGuardClient", () => ({
  AccessGuardClient: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("@/lib/portalTheme", () => ({
  usePortalThemeMode: () => ({ mode: "light" }),
}));

vi.mock("@/lib/navigation", () => ({
  getRouteByPath: () => ({ href: "/home", label: "Home", description: "Home" }),
}));

vi.mock("@/lib/branding", () => ({
  resolvePortalBranding: () => ({
    appLabel: "Portal",
    portalBrandColor: "#2563eb",
    portalBrandAccentColor: "#0f172a",
    portalBrandLightColor: "#dbeafe",
    sidebarBgEnforced: "#ffffff",
    sidebarTextEnforced: "#0f172a",
    sidebarLinkEnforced: "#334155",
    sidebarLinkHoverEnforced: "#0f172a",
  }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  portalSessionMocks.state.status = "unauthenticated";
  portalSessionMocks.state.error = null;
  portalSessionMocks.state.session = null;
  portalAuthMocks.startAuth0Login.mockRejectedValue(
    new portalAuthMocks.AuthRedirectError()
  );
  portalAuthMocks.logoutRejectedPortalSession.mockResolvedValue(undefined);
  window.history.replaceState({}, "", "/home/");
});

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

describe("PortalLayoutShell auth states", () => {
  it("starts Auth0 login for unauthenticated protected portal sessions", async () => {
    const beforeHref = window.location.href;

    render(<PortalLayoutShell>Portal content</PortalLayoutShell>);

    expect(screen.queryByText("Opening sign in")).not.toBeInTheDocument();
    await waitFor(() => {
      expect(portalAuthMocks.startAuth0Login).toHaveBeenCalledWith("/home/");
    });
    expect(window.location.href).toBe(beforeHref);
  });

  it("fully logs out a backend-rejected session without rendering an unauthorized screen", async () => {
    portalSessionMocks.state.status = "session_error";
    portalSessionMocks.state.error = new Error("Signed in, but no portal organization was resolved.");

    render(<PortalLayoutShell>Portal content</PortalLayoutShell>);

    expect(screen.queryByText("Portal session unavailable")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Sign in again" })).not.toBeInTheDocument();
    expect(portalAuthMocks.startAuth0Login).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(portalAuthMocks.logoutRejectedPortalSession).toHaveBeenCalledWith("/home/");
    });
  });

  it("does not show a facility-assignment warning for individual DocuDent accounts", () => {
    portalSessionMocks.state.status = "success";
    portalSessionMocks.state.session = {
      user: {
        user_id: "auth0|individual-user",
        organization_id: "free-org",
        is_free_user: true,
      },
      organization: {
        organization_id: "free-org",
        name: "Free Tier Organization",
        type: "paid",
      },
      organization_type: "paid",
      plan_tier: "pro-plan",
      portal_access: true,
      onboardingStatus: "facility_unassigned",
      missingFields: ["facility_membership"],
      issues: [{ reference_code: "ONB-118660", issue_key: "facility_unassigned" }],
    };

    render(<PortalLayoutShell>Portal content</PortalLayoutShell>);

    expect(screen.getByText("Portal content")).toBeInTheDocument();
    expect(screen.queryByText("Your account setup needs attention.")).not.toBeInTheDocument();
    expect(screen.queryByText(/ONB-118660/)).not.toBeInTheDocument();
  });

  it("keeps actionable onboarding warnings for non-individual accounts", () => {
    portalSessionMocks.state.status = "success";
    portalSessionMocks.state.session = {
      user: {
        user_id: "auth0|organization-user",
        organization_id: "customer-org",
        is_free_user: false,
      },
      organization: {
        organization_id: "customer-org",
        name: "Customer Organization",
        type: "paid",
      },
      organization_type: "paid",
      plan_tier: "pro-plan",
      portal_access: true,
      onboardingStatus: "facility_unassigned",
      missingFields: ["facility_membership"],
      issues: [{ reference_code: "ONB-CUSTOMER", issue_key: "facility_unassigned" }],
    };

    render(<PortalLayoutShell>Portal content</PortalLayoutShell>);

    expect(screen.getByText("Your account setup needs attention.")).toBeInTheDocument();
    expect(screen.getByText(/ONB-CUSTOMER/)).toBeInTheDocument();
  });
});

describe("AuthCallbackClient", () => {
  it("shows provider errors without automatically starting another login", async () => {
    window.history.replaceState(
      {},
      "",
      "/auth/callback/?error=access_denied&error_description=Service%20not%20found&state=stale-state"
    );

    render(<AuthCallbackClient />);

    await waitFor(() => {
      expect(screen.getByText("Sign-in callback failed")).toBeInTheDocument();
    });
    expect(portalAuthMocks.clearPortalAuthStorage).toHaveBeenCalledWith();
    expect(portalAuthMocks.cleanAuthCallbackUrl).toHaveBeenCalledTimes(1);
    expect(portalAuthMocks.startAuth0Login).not.toHaveBeenCalled();
    expect(portalAuthMocks.completeAuth0Callback).not.toHaveBeenCalled();
    expect(screen.getByText("Service not found")).toBeInTheDocument();
  });

  it("does not render callback code or state in visible UI", async () => {
    window.history.replaceState({}, "", "/auth/callback/?code=secret-code&state=secret-state");

    render(<AuthCallbackClient />);

    await waitFor(() => {
      expect(portalAuthMocks.completeAuth0Callback).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(/\/auth\/callback\/?/)).not.toBeInTheDocument();
    expect(screen.queryByText(/secret-code/)).not.toBeInTheDocument();
    expect(screen.queryByText(/secret-state/)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(window.location.href);
  });
});

describe("auth redirect-loop regression checks", () => {
  it("keeps session 401 handling free of Auth0 auto-redirect retry hacks", () => {
    const source = readFileSync(
      join(process.cwd(), "src/lib/portalSession.tsx"),
      "utf8"
    );

    expect(source).not.toContain("startAuth0Login");
    expect(source).not.toContain("session_401_start_auth0");
    expect(source).not.toMatch(/setTimeout\s*\(\s*\(\)\s*=>\s*\{\s*void loadSession\(\);\s*\}\s*,\s*750\s*\)/);
  });
});
