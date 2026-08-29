import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PortalSessionResponse } from "@/lib/types";
import { PortalSessionProvider, usePortalSession } from "@/lib/portalSession";

const sessionServiceMocks = vi.hoisted(() => ({
  fetchPortalSession: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/home/",
}));

vi.mock("@/lib/config", () => ({
  portalConfig: {
    environment: "production",
    usesDefaultApiBase: false,
  },
  withPortalBasePath: (path: string) => path,
}));

vi.mock("@/lib/services/sessionService", () => ({
  fetchPortalSession: sessionServiceMocks.fetchPortalSession,
}));

function makeStatusError(status: number) {
  const error = new Error(`Session failed ${status}`) as Error & { status?: number };
  error.status = status;
  return error;
}

function makeSession(overrides: Partial<PortalSessionResponse> = {}): PortalSessionResponse {
  return {
    user: {
      user_id: "user-1",
      display_name: "Portal User",
      email: "user@example.com",
      role: "admin",
      organization_id: "org-1",
      is_active: true,
      is_free_user: false,
      show_ads: false,
      permissions: [],
    },
    organization: {
      organization_id: "org-1",
      name: "Portal Org",
      type: "admin",
    },
    portal_access: true,
    is_admin: true,
    locations: [],
    selected_location: null,
    location_locked: false,
    requires_ads: false,
    timestamp: "2026-01-01T00:00:00.000Z",
    ...overrides,
  } as PortalSessionResponse;
}

function SessionProbe() {
  const { status, error, organizationId, isSuperAdmin, isOrgAdmin, isFacilityAdmin, locations } = usePortalSession();
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="error">{error?.message ?? ""}</div>
      <div data-testid="organization">{organizationId ?? ""}</div>
      <div data-testid="access">{[isSuperAdmin, isOrgAdmin, isFacilityAdmin].map(String).join(",")}</div>
      <div data-testid="facility-list">{locations.map((location) => location.location_label).join(",")}</div>
    </div>
  );
}

function renderProvider() {
  return render(
    <PortalSessionProvider>
      <SessionProbe />
    </PortalSessionProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("PortalSessionProvider", () => {
  it("sets unauthenticated on a 401 with no token and does not navigate", async () => {
    const beforeHref = window.location.href;
    sessionServiceMocks.fetchPortalSession.mockRejectedValue(makeStatusError(401));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("unauthenticated");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("No active portal session was found.");
    expect(window.location.href).toBe(beforeHref);
  });

  it("sets session_error on a 401 when a token exists and does not navigate", async () => {
    window.localStorage.setItem("portal_token", "persisted-token");
    const beforeHref = window.location.href;
    sessionServiceMocks.fetchPortalSession.mockRejectedValue(makeStatusError(401));

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("session_error");
    });
    expect(screen.getByTestId("error")).toHaveTextContent(
      "Signed in, but the portal API rejected this account session."
    );
    expect(window.location.href).toBe(beforeHref);
  });

  it("sets session_error when the session response has no resolved organization", async () => {
    sessionServiceMocks.fetchPortalSession.mockResolvedValue(
      makeSession({
        organization: undefined,
        user: {
          ...makeSession().user,
          organization_id: undefined,
        },
      })
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("session_error");
    });
    expect(screen.getByTestId("error")).toHaveTextContent("no portal organization was resolved");
  });

  it("sets success when the backend session resolves a user and organization", async () => {
    sessionServiceMocks.fetchPortalSession.mockResolvedValue(makeSession());

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("success");
    });
    expect(screen.getByTestId("organization")).toHaveTextContent("org-1");
  });

  it("resolves administrative access from the active organization membership", async () => {
    sessionServiceMocks.fetchPortalSession.mockResolvedValue(
      makeSession({
        is_admin: false,
        user: {
          ...makeSession().user,
          role: "viewer",
          organization_membership: {
            membership_id: "membership-1",
            user_id: "user-1",
            organization_id: "org-1",
            role: "super_admin",
            is_primary: true,
            is_active: true,
          },
        },
      })
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("status")).toHaveTextContent("success");
    });
    expect(screen.getByTestId("access")).toHaveTextContent("true,true,true");
  });

  it("combines and deduplicates every active facility list returned by the backend", async () => {
    sessionServiceMocks.fetchPortalSession.mockResolvedValue(
      makeSession({
        locations: [
          {
            location_id: "location-one",
            location_label: "SITE ONE",
            is_active: true,
          },
        ],
        facilities: [
          {
            location_id: "location-one",
            location_label: "SITE ONE",
            is_active: true,
          },
          {
            location_id: "location-two",
            location_label: "SITE TWO",
            is_active: true,
          },
          {
            location_id: "location-inactive",
            location_label: "INACTIVE",
            is_active: false,
          },
        ],
      })
    );

    renderProvider();

    await waitFor(() => {
      expect(screen.getByTestId("facility-list")).toHaveTextContent("SITE ONE,SITE TWO");
    });
  });
});
