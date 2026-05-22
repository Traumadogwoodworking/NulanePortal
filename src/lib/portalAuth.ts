import {
  createAuth0Client,
  type Auth0Client as Auth0SpaClient,
} from "@auth0/auth0-spa-js";

const STORAGE_KEYS = {
  token: "portal_token",
  user: "portal_user",
  authenticated: "portal_authenticated",
};

const DEFAULT_AUTH0_DOMAIN = "nulanesystems.us.auth0.com";
const DEFAULT_AUTH0_CLIENT_ID = "WkYT29HkNJo5rjDMPGTxAdb04QdKQsPc";
const DEFAULT_AUTH0_AUDIENCE = "https://api.nulanesystems.com";
const DEFAULT_AUTH0_REDIRECT_URI = "https://nulanesystems.com/portal";
const DEV_ACCESS_TOKEN = "dev-portal-token";
const DEV_AUTH_BYPASS_FLAG = "true";

type Auth0Client = Auth0SpaClient;

type AuthConfig = {
  domain: string;
  clientId: string;
  audience: string;
  redirectUri: string;
};

const DEBUG_AUTH0 = process.env.NODE_ENV !== "production";
let cachedAuthConfig: AuthConfig | null = null;

function maskSecret(value: string, leading = 3, trailing = 3) {
  if (!value) {
    return value;
  }
  if (value.length <= leading + trailing + 1) {
    return value;
  }
  return `${value.slice(0, leading)}…${value.slice(-trailing)}`;
}

function describeConfig(config: AuthConfig) {
  return {
    domain: config.domain,
    audience: config.audience,
    redirectUri: config.redirectUri,
    clientId: maskSecret(config.clientId, 4, 3),
  };
}

export function getPortalAuthDebugConfig() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return describeConfig(getAuthConfig());
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Unknown auth config error",
      origin: window.location.origin,
      path: window.location.pathname,
    };
  }
}

class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

class AuthRedirectError extends Error {
  constructor(message = "Redirecting to identity provider") {
    super(message);
    this.name = "AuthRedirectError";
  }
}

const isBrowser = () => typeof window !== "undefined" && typeof window.document !== "undefined";

function ensureBrowserEnv() {
  if (!isBrowser()) {
    throw new AuthConfigError("Auth0 requires a browser environment");
  }
}

function isDevAuthBypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    (process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS ?? "").toLowerCase() === DEV_AUTH_BYPASS_FLAG
  );
}

function buildDevAuth0Client(): Auth0Client {
  return {
    async isAuthenticated() {
      return true;
    },
    async loginWithRedirect(options?: Parameters<Auth0Client["loginWithRedirect"]>[0]) {
      const returnTo =
        typeof options?.appState === "object" &&
        options.appState !== null &&
        typeof (options.appState as { returnTo?: unknown }).returnTo === "string"
          ? ((options.appState as { returnTo?: string }).returnTo ?? "").trim() || "/"
          : "/";
      if (isBrowser()) {
        window.history.replaceState({}, document.title, returnTo);
      }
    },
    async handleRedirectCallback() {
      return { appState: { returnTo: "/" } } as unknown;
    },
    async getTokenSilently() {
      return "";
    },
    logout() {
      if (isBrowser()) {
        window.location.assign("/");
      }
    },
  } as unknown as Auth0Client;
}

function buildAuthConfig(): AuthConfig {
  ensureBrowserEnv();
  const domain = (process.env.NEXT_PUBLIC_AUTH0_DOMAIN || DEFAULT_AUTH0_DOMAIN).trim();
  const clientId = (process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || DEFAULT_AUTH0_CLIENT_ID).trim();
  const audience = (process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || DEFAULT_AUTH0_AUDIENCE).trim();
  const redirectOverride = (process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || "").trim();
  const browserOrigin = window.location.origin || DEFAULT_AUTH0_REDIRECT_URI;
  const localRedirectUri =
    browserOrigin.includes("://127.0.0.1") || browserOrigin.includes("://::1")
      ? browserOrigin.replace("://127.0.0.1", "://localhost").replace("://::1", "://localhost")
      : browserOrigin;
  const redirectUri = redirectOverride || localRedirectUri || DEFAULT_AUTH0_REDIRECT_URI;

  if (!domain || !clientId || !audience || !redirectUri) {
    console.error("[Auth0] configuration incomplete", { domain, clientId, audience, redirectUri });
    throw new AuthConfigError(
      "Auth0 configuration is missing. Provide NEXT_PUBLIC_AUTH0_DOMAIN, NEXT_PUBLIC_AUTH0_CLIENT_ID, and NEXT_PUBLIC_AUTH0_AUDIENCE.",
    );
  }

  return { domain, clientId, audience, redirectUri };
}

function getAuthConfig(): AuthConfig {
  if (cachedAuthConfig) {
    return cachedAuthConfig;
  }
  const config = buildAuthConfig();
  cachedAuthConfig = config;
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] bootstrap config resolved", describeConfig(config));
  }
  return config;
}

let auth0ClientPromise: Promise<Auth0Client> | null = null;
let redirectHandlingPromise: Promise<void> | null = null;

async function getAuth0Client() {
  if (isDevAuthBypassEnabled()) {
    return buildDevAuth0Client();
  }
  if (auth0ClientPromise) {
    return auth0ClientPromise;
  }
  const config = getAuthConfig();
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] calling createAuth0Client", describeConfig(config));
  }
  auth0ClientPromise = createAuth0Client({
    domain: config.domain,
    clientId: config.clientId,
    authorizationParams: {
      audience: config.audience,
      redirect_uri: config.redirectUri,
    },
    cacheLocation: "localstorage",
    useRefreshTokens: true,
  });
  return auth0ClientPromise;
}

function getUrlSearchParams() {
  return isBrowser() ? new URLSearchParams(window.location.search) : new URLSearchParams();
}

function waitForToken(tokenPromise: Promise<string>, timeoutMs = 5000): Promise<string> {
  return Promise.race([
    tokenPromise,
    new Promise<string>((_, reject) => {
      window.setTimeout(() => {
        reject(new Error("Timed out waiting for Auth0 token."));
      }, timeoutMs);
    }),
  ]);
}

async function handleRedirectCallbackIfNeeded() {
  if (!isBrowser()) {
    return;
  }
  
  if (redirectHandlingPromise) {
    if (DEBUG_AUTH0) {
      console.debug("[Auth0] handleRedirectCallbackIfNeeded: already handling or handled");
    }
    return redirectHandlingPromise;
  }

  const params = getUrlSearchParams();
  if (params.has("code") && params.has("state")) {
    if (DEBUG_AUTH0) {
      console.debug("[Auth0] handling redirect callback", {
        code: params.get("code")?.slice(0, 5) + "...",
        state: params.get("state")?.slice(0, 5) + "...",
        redirectUri: getAuthConfig().redirectUri,
      });
    }
    redirectHandlingPromise = (async () => {
      try {
        const destination = await completeAuth0Callback();
        window.location.replace(destination);
        if (DEBUG_AUTH0) {
          console.debug("[Auth0] redirect callback complete", { destination });
        }
      } catch (error) {
        console.warn("[Auth0] redirect callback failed", error);
        redirectHandlingPromise = null;
        throw error;
      }
    })();

    return redirectHandlingPromise;
  }
  
  // No code/state to handle
  return Promise.resolve();
}

export async function completeAuth0Callback(): Promise<string> {
  const client = await getAuth0Client();
  const result = await client.handleRedirectCallback();
  const appState = result?.appState;
  const returnTo =
    appState && typeof appState === "object" && typeof (appState as { returnTo?: unknown }).returnTo === "string"
      ? ((appState as { returnTo?: string }).returnTo ?? "").trim()
      : "";
  const storedReturnTo =
    (() => {
      try {
        return window.sessionStorage.getItem("portal_login_return_to") || "";
      } catch {
        return "";
      }
    })().trim();
  if (storedReturnTo) {
    try {
      window.sessionStorage.removeItem("portal_login_return_to");
    } catch (error) {
      console.warn("[Auth0] unable to clear stored returnTo", error);
    }
  }
  const destination = returnTo || storedReturnTo || "/dashboard";
  try {
    const token = await waitForToken(
      client.getTokenSilently({
        authorizationParams: {
          audience: getAuthConfig().audience,
        },
      }),
    );
    persistPortalToken(token);
  } catch (error) {
    console.warn("[Auth0] token bootstrap after callback failed", error);
  }
  return destination;
}

function isInteractiveLoginError(error: unknown) {
  const err = error as { error?: string };
  if (!err || typeof err !== "object") {
    return false;
  }
  const interactiveErrors = new Set([
    "login_required",
    "consent_required",
    "interaction_required",
    "invalid_token",
  ]);
  return typeof err.error === "string" && interactiveErrors.has(err.error);
}

function getLocalStorage(): Storage | null {
  if (!isBrowser()) {
    return null;
  }
  try {
    return window.localStorage;
  } catch (error) {
    console.warn("Unable to access localStorage", error);
    return null;
  }
}

export function persistPortalToken(token?: string) {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  if (token && token.trim()) {
    storage.setItem(STORAGE_KEYS.token, token);
    storage.setItem(STORAGE_KEYS.authenticated, "true");
  } else {
    storage.removeItem(STORAGE_KEYS.token);
    storage.removeItem(STORAGE_KEYS.authenticated);
  }
}

export function persistPortalUser(user?: unknown) {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  if (!user) {
    return;
  }
  try {
    storage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
    storage.setItem(STORAGE_KEYS.authenticated, "true");
  } catch (error) {
    console.warn("Unable to persist portal user", error);
  }
}

export function clearPortalAuthStorage() {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  storage.removeItem(STORAGE_KEYS.token);
  storage.removeItem(STORAGE_KEYS.user);
  storage.removeItem(STORAGE_KEYS.authenticated);
  redirectHandlingPromise = null;
}

export async function redirectToAuth0Login(returnTo?: string): Promise<never> {
  if (isDevAuthBypassEnabled()) {
    if (isBrowser()) {
      window.location.replace(returnTo || "/");
    }
    throw new AuthRedirectError("Dev auth bypass redirect");
  }
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] redirectToAuth0Login invoked", {
      returnTo: returnTo || "/",
      origin: isBrowser() ? window.location.origin : "server",
      path: isBrowser() ? window.location.pathname : "server",
    });
  }
  const client = await getAuth0Client();
  clearPortalAuthStorage();
  const config = getAuthConfig();
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] starting login redirect", describeConfig(config));
  }
  try {
    await client.loginWithRedirect({
      appState: returnTo ? { returnTo } : undefined,
      authorizationParams: {
        audience: config.audience,
        redirect_uri: config.redirectUri,
        prompt: "login",
      },
    });
  } catch (error) {
    console.warn("[Auth0] loginWithRedirect failed", {
      error,
      config: describeConfig(config),
      returnTo: returnTo || "/",
    });
    throw error;
  }
  throw new AuthRedirectError();
}

export async function logoutPortal(): Promise<void> {
  if (isDevAuthBypassEnabled()) {
    clearPortalAuthStorage();
    if (isBrowser()) {
      window.location.assign("/");
    }
    return;
  }
  const client = await getAuth0Client();
  clearPortalAuthStorage();
  const config = getAuthConfig();
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] starting logout", describeConfig(config));
  }
  await client.logout({
    logoutParams: {
      returnTo: config.redirectUri,
    },
  });
}

export async function getPortalAccessToken() {
  if (isDevAuthBypassEnabled()) {
    persistPortalToken(DEV_ACCESS_TOKEN);
    return DEV_ACCESS_TOKEN;
  }
  const client = await getAuth0Client();
  await handleRedirectCallbackIfNeeded();
  
  const isAuthenticated = await client.isAuthenticated();
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] isAuthenticated?", isAuthenticated);
  }
  
  if (!isAuthenticated) {
    if (DEBUG_AUTH0) {
      console.debug("[Auth0] not authenticated, redirecting to login");
    }
    return redirectToAuth0Login();
  }
  
  const config = getAuthConfig();
  try {
    if (DEBUG_AUTH0) {
      console.debug("[Auth0] requesting silent token", describeConfig(config));
    }
    const token = await client.getTokenSilently({
      authorizationParams: {
        audience: config.audience,
      },
    });
    persistPortalToken(token);
    return token;
  } catch (error) {
    if (DEBUG_AUTH0) {
      console.warn("[Auth0] silent token error", {
        error,
        config: describeConfig(config),
      });
    }
    if (isInteractiveLoginError(error)) {
      return redirectToAuth0Login();
    }
    throw error;
  }
}

export { AuthConfigError, AuthRedirectError };
