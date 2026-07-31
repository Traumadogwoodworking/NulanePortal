import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getPortalAccessToken: vi.fn(),
  clearStalePortalSession: vi.fn(),
  logAuthFlow: vi.fn(),
  logoutRejectedPortalSession: vi.fn(),
}));

vi.mock("@/lib/config", () => ({
  buildApiUrl: (path: string) => `https://api.test${path}`,
  buildDocuFitUrl: (path: string) => `https://docufit.test${path}`,
  portalConfig: { apiBase: "https://api.test" },
}));

vi.mock("@/lib/devMockApi", () => ({
  isDevMockEnabled: () => false,
  resolveDevMockResponse: vi.fn(async () => null),
}));

vi.mock("@/lib/portalAuth", () => ({
  getPortalAccessToken: authMocks.getPortalAccessToken,
  clearStalePortalSession: authMocks.clearStalePortalSession,
  logAuthFlow: authMocks.logAuthFlow,
  logoutRejectedPortalSession: authMocks.logoutRejectedPortalSession,
}));

describe("api client watchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    authMocks.getPortalAccessToken.mockReset();
    authMocks.clearStalePortalSession.mockReset();
    authMocks.logAuthFlow.mockReset();
    authMocks.logoutRejectedPortalSession.mockReset();
    authMocks.logoutRejectedPortalSession.mockResolvedValue(undefined);
    window.localStorage.setItem("portalApiTrace", "1");
    window.__portalFetchDebug?.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    window.localStorage.clear();
  });

  it("rejects when the token phase hangs", async () => {
    const { apiFetch, PortalApiTimeoutError } = await import("@/lib/apiClient");
    authMocks.getPortalAccessToken.mockReturnValue(new Promise(() => undefined));
    vi.stubGlobal("fetch", vi.fn());

    const request = apiFetch("/user/me", {
      portal: { callerLabel: "test.tokenHang", timeoutMs: 10 },
    });
    const assertion = expect(request).rejects.toBeInstanceOf(PortalApiTimeoutError);
    await vi.advanceTimersByTimeAsync(10);

    await assertion;
    expect(fetch).not.toHaveBeenCalled();
    expect(window.__portalFetchDebug?.lastErrors()[0]?.phase).toBe("timeout");
  });

  it("rejects when fetch never returns", async () => {
    const { apiFetch, PortalApiTimeoutError } = await import("@/lib/apiClient");
    authMocks.getPortalAccessToken.mockResolvedValue("token");
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => undefined)));

    const request = apiFetch("/reports/list", {
      portal: { callerLabel: "test.fetchHang", timeoutMs: 10 },
    });
    const assertion = expect(request).rejects.toBeInstanceOf(PortalApiTimeoutError);
    await vi.advanceTimersByTimeAsync(10);

    await assertion;
    expect(window.__portalFetchDebug?.lastErrors()[0]?.path).toBe("/reports/list");
  });

  it("does not clear portal auth on 401 and exposes an auth-expired error", async () => {
    const { apiFetch, PortalApiAuthExpiredError } = await import("@/lib/apiClient");
    authMocks.getPortalAccessToken.mockResolvedValue("token");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));

    await expect(
      apiFetch("/user/me", {
        portal: { callerLabel: "test.authExpired", timeoutMs: 1000, skipAuthRedirect: true },
      })
    ).rejects.toBeInstanceOf(PortalApiAuthExpiredError);

    expect(authMocks.clearStalePortalSession).not.toHaveBeenCalled();
    expect(authMocks.logoutRejectedPortalSession).not.toHaveBeenCalled();
    expect(window.__portalFetchDebug?.lastErrors()[0]?.phase).toBe("auth_expired");
  });

  it("fully logs out and redirects when the backend returns 401", async () => {
    const { apiFetch, PortalApiAuthExpiredError } = await import("@/lib/apiClient");
    authMocks.getPortalAccessToken.mockResolvedValue("token");
    window.history.replaceState({}, "", "/reports/damage/?page=2#latest");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 401 })));

    await expect(
      apiFetch("/reports/list", {
        portal: { callerLabel: "test.backendRejected", timeoutMs: 1000 },
      })
    ).rejects.toBeInstanceOf(PortalApiAuthExpiredError);

    expect(authMocks.logoutRejectedPortalSession).toHaveBeenCalledWith(
      "/reports/damage/?page=2#latest"
    );
    expect(window.__portalFetchDebug?.lastErrors()[0]?.phase).toBe("auth_expired");
  });

  it("does not log out a valid session for an endpoint-level 403", async () => {
    const { apiFetch, PortalApiAuthExpiredError } = await import("@/lib/apiClient");
    authMocks.getPortalAccessToken.mockResolvedValue("token");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 403 })));

    await expect(
      apiFetch("/users", {
        portal: { callerLabel: "test.endpointForbidden", timeoutMs: 1000 },
      })
    ).rejects.toBeInstanceOf(PortalApiAuthExpiredError);

    expect(authMocks.logoutRejectedPortalSession).not.toHaveBeenCalled();
    expect(window.__portalFetchDebug?.lastErrors()[0]?.phase).toBe("auth_expired");
  });
});
