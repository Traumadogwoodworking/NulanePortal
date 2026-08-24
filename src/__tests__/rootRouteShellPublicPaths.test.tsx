import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RootRouteShell } from "@/components/RootRouteShell";

const navigationMocks = vi.hoisted(() => ({
  pathname: "/",
  searchParams: new URLSearchParams(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => navigationMocks.pathname,
  useSearchParams: () => navigationMocks.searchParams,
}));

vi.mock("@/lib/portalSession", () => ({
  PortalSessionProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="portal-session-provider">{children}</div>
  ),
}));

vi.mock("@/lib/portalData", () => ({
  PortalDataProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="portal-data-provider">{children}</div>
  ),
}));

vi.mock("@/components/AppShellRouter", () => ({
  AppShellRouter: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/app/auth/callback/AuthCallbackClient", () => ({
  AuthCallbackClient: () => <div>Auth callback</div>,
}));

beforeEach(() => {
  navigationMocks.pathname = "/";
  navigationMocks.searchParams = new URLSearchParams();
});

describe("RootRouteShell public routes", () => {
  it("keeps the signup route outside the authenticated portal shell", () => {
    navigationMocks.pathname = "/signup/";

    render(
      <RootRouteShell>
        <div>Definian signup</div>
      </RootRouteShell>
    );

    expect(screen.getByText("Definian signup")).toBeInTheDocument();
    expect(screen.queryByTestId("portal-session-provider")).not.toBeInTheDocument();
    expect(screen.queryByTestId("portal-data-provider")).not.toBeInTheDocument();
  });
});
