import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const auth0Mocks = vi.hoisted(() => ({
  createAuth0Client: vi.fn(),
  loginWithRedirect: vi.fn(),
  handleRedirectCallback: vi.fn(),
  getTokenSilently: vi.fn(),
  isAuthenticated: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@auth0/auth0-spa-js", () => ({
  createAuth0Client: auth0Mocks.createAuth0Client,
}));

function buildAuth0Client() {
  return {
    loginWithRedirect: auth0Mocks.loginWithRedirect,
    handleRedirectCallback: auth0Mocks.handleRedirectCallback,
    getTokenSilently: auth0Mocks.getTokenSilently,
    isAuthenticated: auth0Mocks.isAuthenticated,
    logout: auth0Mocks.logout,
  };
}

async function importPortalAuth() {
  return import("@/lib/portalAuth");
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState({}, "", "/home/");
  auth0Mocks.createAuth0Client.mockResolvedValue(buildAuth0Client());
  auth0Mocks.isAuthenticated.mockResolvedValue(false);
  auth0Mocks.getTokenSilently.mockRejectedValue(new Error("No token"));
  auth0Mocks.handleRedirectCallback.mockResolvedValue({ appState: { returnTo: "/home/" } });
});

afterEach(() => {
  vi.unstubAllEnvs();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe("getPortalAccessToken", () => {
  it("returns a persisted portal token without invoking Auth0 redirect behavior", async () => {
    window.localStorage.setItem("portal_token", "persisted-token");
    const beforeHref = window.location.href;
    const { getPortalAccessToken } = await importPortalAuth();

    await expect(getPortalAccessToken()).resolves.toBe("persisted-token");

    expect(auth0Mocks.createAuth0Client).not.toHaveBeenCalled();
    expect(auth0Mocks.loginWithRedirect).not.toHaveBeenCalled();
    expect(window.location.href).toBe(beforeHref);
  });

  it("returns null when no token or Auth0 session exists and does not navigate", async () => {
    const beforeHref = window.location.href;
    const { getPortalAccessToken } = await importPortalAuth();

    await expect(getPortalAccessToken()).resolves.toBeNull();

    expect(auth0Mocks.createAuth0Client).toHaveBeenCalledTimes(1);
    expect(auth0Mocks.isAuthenticated).toHaveBeenCalledTimes(1);
    expect(auth0Mocks.loginWithRedirect).not.toHaveBeenCalled();
    expect(window.location.href).toBe(beforeHref);
  });
});

describe("completeAuth0Callback", () => {
  it("guards concurrent callback completion with one Auth0 callback exchange", async () => {
    window.history.replaceState({}, "", "/auth/callback/?code=present&state=present");
    auth0Mocks.isAuthenticated.mockResolvedValue(true);
    auth0Mocks.getTokenSilently.mockResolvedValue("callback-token");
    const { completeAuth0Callback } = await importPortalAuth();

    const [first, second] = await Promise.all([
      completeAuth0Callback(),
      completeAuth0Callback(),
    ]);

    expect(first).toBe("/home/");
    expect(second).toBe("/home/");
    expect(auth0Mocks.handleRedirectCallback).toHaveBeenCalledTimes(1);
    expect(auth0Mocks.getTokenSilently).toHaveBeenCalledTimes(1);
    expect(window.localStorage.getItem("portal_token")).toBe("callback-token");
  });

  it("records duplicate facade invocations while consuming the Auth0 transaction once", async () => {
    window.localStorage.setItem("portalAuthTrace", "1");
    window.sessionStorage.setItem("a0.spajs.txs.test", "redacted-transaction");
    window.history.replaceState({}, "", "/auth/callback/?code=present&state=state-ending");
    auth0Mocks.getTokenSilently.mockResolvedValue("callback-token");
    const logSpy = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const { completeAuth0Callback } = await importPortalAuth();

    await Promise.all([completeAuth0Callback(), completeAuth0Callback()]);

    expect(auth0Mocks.handleRedirectCallback).toHaveBeenCalledTimes(1);
    const invocationLogs = logSpy.mock.calls
      .map((call) => call[1] as Record<string, unknown>)
      .filter((entry) => entry?.functionName === "completeAuth0Callback" && entry?.reason === "invoked");
    expect(invocationLogs).toEqual([
      expect.objectContaining({ invocationCount: 1, stateSuffix: "ending", pkceTransactionPresent: true }),
      expect.objectContaining({ invocationCount: 2, stateSuffix: "ending", pkceTransactionPresent: true }),
    ]);
    expect(JSON.stringify(invocationLogs)).not.toContain("state-ending");
    expect(JSON.stringify(invocationLogs)).not.toContain("redacted-transaction");
  });

  it("does not reuse a completed callback result for a later Auth0 code/state", async () => {
    auth0Mocks.isAuthenticated.mockResolvedValue(true);
    auth0Mocks.getTokenSilently
      .mockResolvedValueOnce("first-callback-token")
      .mockResolvedValueOnce("second-callback-token");
    const { completeAuth0Callback } = await importPortalAuth();

    window.history.replaceState({}, "", "/auth/callback/?code=first&state=first");
    await expect(completeAuth0Callback()).resolves.toBe("/home/");

    window.history.replaceState({}, "", "/auth/callback/?code=second&state=second");
    await expect(completeAuth0Callback()).resolves.toBe("/home/");

    expect(auth0Mocks.handleRedirectCallback).toHaveBeenCalledTimes(2);
    expect(auth0Mocks.getTokenSilently).toHaveBeenCalledTimes(2);
    expect(window.localStorage.getItem("portal_token")).toBe("second-callback-token");
  });

  it("fails the callback when Auth0 does not provide a portal access token", async () => {
    window.history.replaceState({}, "", "/auth/callback/?code=present&state=present");
    auth0Mocks.isAuthenticated.mockResolvedValue(true);
    auth0Mocks.getTokenSilently.mockRejectedValue(new Error("login required"));
    const { completeAuth0Callback } = await importPortalAuth();

    await expect(completeAuth0Callback()).rejects.toThrow(
      "Auth0 callback completed, but no portal access token could be retrieved."
    );

    expect(window.localStorage.getItem("portal_token")).toBeNull();
  });
});

describe("startAuth0Login", () => {
  it("uses the local callback URL on localhost even when env points at the public portal", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH0_REDIRECT_URI", "https://inspection-trac.com/auth/callback/");
    window.history.replaceState({}, "", "http://localhost:3000/login?returnTo=%2Fhome%2F");
    const { startAuth0Login, AuthRedirectError } = await importPortalAuth();

    await expect(startAuth0Login("/home/")).rejects.toBeInstanceOf(AuthRedirectError);

    expect(auth0Mocks.loginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        authorizationParams: expect.objectContaining({
          redirect_uri: "http://localhost:3000/auth/callback/",
        }),
      })
    );
  });

  it("single-flights duplicate login starts so one transaction is created", async () => {
    window.history.replaceState({}, "", "http://localhost:3000/login?returnTo=%2Fhome%2F");
    const { startAuth0Login, AuthRedirectError } = await importPortalAuth();

    const results = await Promise.allSettled([
      startAuth0Login("/home/"),
      startAuth0Login("/home/"),
    ]);

    expect(results).toHaveLength(2);
    expect(results.every((result) => result.status === "rejected" && result.reason instanceof AuthRedirectError)).toBe(true);
    expect(auth0Mocks.loginWithRedirect).toHaveBeenCalledTimes(1);
  });
});

describe("startFacilityRegistrationAuth", () => {
  it("binds password or SSO authentication to the Auth0 organization and entered email", async () => {
    window.history.replaceState({}, "", "http://localhost:3000/join/?enrollment=opaque-session-token");
    const { startFacilityRegistrationAuth, AuthRedirectError } = await importPortalAuth();

    await expect(startFacilityRegistrationAuth(
      "/join/?enrollment=opaque-session-token",
      { email: " Person@Example.com ", signup: true }
    )).rejects.toBeInstanceOf(AuthRedirectError);

    expect(auth0Mocks.loginWithRedirect).toHaveBeenCalledWith(
      expect.objectContaining({
        appState: { returnTo: "/join/?enrollment=opaque-session-token" },
        authorizationParams: expect.objectContaining({
          organization: "org_GRicZ7Jqg1r3aerr",
          login_hint: "person@example.com",
          screen_hint: "signup",
        }),
      })
    );
  });
});

describe("logoutRejectedPortalSession", () => {
  it("clears local auth, logs out of Auth0, and returns through the auto-login route", async () => {
    window.localStorage.setItem("portal_token", "rejected-token");
    window.localStorage.setItem("@@auth0spajs@@::cached", "rejected-session");
    const { logoutRejectedPortalSession } = await importPortalAuth();

    await logoutRejectedPortalSession("/reports/damage/?page=2");

    expect(window.localStorage.getItem("portal_token")).toBeNull();
    expect(window.localStorage.getItem("@@auth0spajs@@::cached")).toBeNull();
    expect(auth0Mocks.logout).toHaveBeenCalledWith({
      logoutParams: {
        returnTo: "http://localhost:3000/portal/",
      },
    });
  });

  it("single-flights simultaneous backend rejections", async () => {
    const { logoutRejectedPortalSession } = await importPortalAuth();

    await Promise.all([
      logoutRejectedPortalSession("/home/"),
      logoutRejectedPortalSession("/home/"),
    ]);

    expect(auth0Mocks.logout).toHaveBeenCalledTimes(1);
  });
});

describe("buildAuthRedirectUri", () => {
  it("derives the callback URL from the active deployment origin", async () => {
    const { buildAuthRedirectUri } = await importPortalAuth();

    expect(
      buildAuthRedirectUri(
        "https://vercel-portal-exact-g63baiqyn-traumadogwoodworkings-projects.vercel.app",
        "https://inspection-trac.com/auth/callback/"
      )
    ).toBe("https://vercel-portal-exact-g63baiqyn-traumadogwoodworkings-projects.vercel.app/auth/callback/");
  });

  it("normalizes localhost aliases for local Auth0 callback allow-listing", async () => {
    const { buildAuthRedirectUri } = await importPortalAuth();

    expect(
      buildAuthRedirectUri(
        "http://127.0.0.1:3000",
        "https://vercel-portal-exact.vercel.app/auth/callback/",
        "fixed",
      ),
    ).toBe("http://localhost:3000/auth/callback/");
  });

  it("uses the explicit override only when fixed redirect mode is enabled", async () => {
    const { buildAuthRedirectUri } = await importPortalAuth();

    expect(
      buildAuthRedirectUri(
        "https://preview.example.vercel.app",
        "https://inspection-trac.com/auth/callback/",
        "fixed"
      )
    ).toBe("https://inspection-trac.com/auth/callback/");
  });
});

describe("portal API audience", () => {
  it("defaults to the Auth0 API audience registered for this portal", async () => {
    vi.stubEnv("NEXT_PUBLIC_AUTH0_AUDIENCE", "");
    const { getPortalAuthDebugConfig } = await importPortalAuth();

    expect(getPortalAuthDebugConfig()).toEqual(
      expect.objectContaining({ audience: "https://api.nulanesystems.com" })
    );
  });
});

describe("portalAuth redirect-loop regression checks", () => {
  it("keeps getPortalAccessToken free of Auth0 redirect calls", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/portalAuth.ts"), "utf8");
    const tokenHelper = source.slice(
      source.indexOf("export async function getPortalAccessToken"),
      source.indexOf("export { AuthConfigError, AuthRedirectError }")
    );

    expect(tokenHelper).not.toContain("redirectToAuth0Login");
    expect(tokenHelper).not.toContain("loginWithRedirect");
  });
});
