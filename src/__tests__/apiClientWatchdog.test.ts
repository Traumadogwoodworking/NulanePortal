import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const authMocks = vi.hoisted(() => ({
  getPortalAccessToken: vi.fn(),
  clearStalePortalSession: vi.fn(),
  logAuthFlow: vi.fn(),
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
}));

describe("api client watchdog", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    authMocks.getPortalAccessToken.mockReset();
    authMocks.clearStalePortalSession.mockReset();
    authMocks.logAuthFlow.mockReset();
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
    expect(window.__portalFetchDebug?.lastErrors()[0]?.phase).toBe("auth_expired");
  });

  it("retries GET network failures and selected 5xx responses only", async () => {
    const { apiFetch } = await import("@/lib/apiClient");
    authMocks.getPortalAccessToken.mockResolvedValue("token");
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockResolvedValueOnce(new Response("temporary", { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      apiFetch("/reports/list", {
        portal: { callerLabel: "test.retry", timeoutMs: 1000, retryDelayMs: 0 },
      })
    ).resolves.toEqual({ ok: true });

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(window.__portalFetchDebug?.history()[0]?.retryCount).toBe(2);
  });

  it("does not retry validation failures or non-idempotent requests by default", async () => {
    const { apiFetch, PortalApiHttpError } = await import("@/lib/apiClient");
    authMocks.getPortalAccessToken.mockResolvedValue("token");
    const validationFetch = vi.fn(async () => new Response("invalid", { status: 400 }));
    vi.stubGlobal("fetch", validationFetch);

    await expect(
      apiFetch("/reports/list", {
        portal: { callerLabel: "test.noValidationRetry", timeoutMs: 1000, retryDelayMs: 0 },
      })
    ).rejects.toBeInstanceOf(PortalApiHttpError);
    expect(validationFetch).toHaveBeenCalledTimes(1);

    const postFetch = vi.fn(async () => new Response("temporary", { status: 503 }));
    vi.stubGlobal("fetch", postFetch);
    await expect(
      apiFetch("/dashboard/home-snapshot/request", {
        method: "POST",
        portal: { callerLabel: "test.noPostRetry", timeoutMs: 1000, retryDelayMs: 0 },
      })
    ).rejects.toBeInstanceOf(PortalApiHttpError);
    expect(postFetch).toHaveBeenCalledTimes(1);
  });

  it("surfaces caller cancellation as an abort rather than a timeout", async () => {
    const { apiFetch, PortalApiAbortError } = await import("@/lib/apiClient");
    authMocks.getPortalAccessToken.mockResolvedValue("token");
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          if (init?.signal?.aborted) {
            reject(new DOMException("aborted", "AbortError"));
            return;
          }
          init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
        })
      )
    );
    const controller = new AbortController();
    const request = apiFetch("/reports/list", {
      signal: controller.signal,
      portal: { callerLabel: "test.abort", timeoutMs: 1000 },
    });
    const assertion = expect(request).rejects.toBeInstanceOf(PortalApiAbortError);
    controller.abort();

    await assertion;
    expect(window.__portalFetchDebug?.lastErrors()[0]?.phase).toBe("aborted");
  });
});
