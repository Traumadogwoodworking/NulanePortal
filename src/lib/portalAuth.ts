import {
  createAuth0Client,
  type Auth0Client as Auth0SpaClient,
} from "@auth0/auth0-spa-js";
import { clearPortalCachedStorage } from "@/lib/portalCacheStorage";

const STORAGE_KEYS = {
  token: "portal_token",
  user: "portal_user",
  authenticated: "portal_authenticated",
};

const DEV_ACCESS_TOKEN = "dev-portal-token";
const DEV_AUTH_BYPASS_FLAG = "true";
const DEFAULT_PORTAL_RETURN_TO = "/home/";
const DEFAULT_LOGOUT_RETURN_TO = "/";
const DEFAULT_LOGIN_PATH = "/login";
const FIXED_REDIRECT_MODE = "fixed";
const FRESH_CALLBACK_STORAGE_KEY = "portal_auth_callback_completed_at";
const AUTH_FLOW_ID_STORAGE_KEY = "portal_auth_flow_id";
const LOGIN_STARTED_AT_STORAGE_KEY = "portal_auth_login_started_at";

type Auth0Client = Auth0SpaClient;

type AuthConfig = {
  domain: string;
  clientId: string;
  organizationId: string;
  audience: string;
  redirectUri: string;
};

const DEBUG_AUTH0 = process.env.NODE_ENV !== "production";
let cachedAuthConfig: AuthConfig | null = null;

type AuthFlowLogFields = Record<string, unknown>;

export function isAuthFlowDebugEnabled() {
  if ((process.env.NEXT_PUBLIC_DEBUG_AUTH_FLOW ?? "").toLowerCase() === "true") {
    return true;
  }
  if (!isBrowser()) {
    return false;
  }
  try {
    return window.localStorage.getItem("portalAuthTrace") === "1";
  } catch {
    return false;
  }
}

function currentPathname() {
  return isBrowser() ? window.location.pathname || "/" : "server";
}

function createAuthFlowId() {
  const randomPart =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `auth-${Date.now().toString(36)}-${randomPart}`;
}

function getAuthFlowId(create = true): string | null {
  if (!isBrowser()) return null;
  try {
    const existing = window.sessionStorage.getItem(AUTH_FLOW_ID_STORAGE_KEY);
    if (existing || !create) return existing;
    const flowId = createAuthFlowId();
    window.sessionStorage.setItem(AUTH_FLOW_ID_STORAGE_KEY, flowId);
    return flowId;
  } catch {
    return create ? createAuthFlowId() : null;
  }
}

export function logAuthFlow(functionName: string, fields: AuthFlowLogFields = {}) {
  console.info("[auth-flow]", {
    correlationId: getAuthFlowId(),
    functionName,
    pathname: currentPathname(),
    ...fields,
  });
}

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
    organizationId: config.organizationId,
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

export function isEmbeddedPortalContext(): boolean {
  if (!isBrowser()) {
    return false;
  }
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

class AuthLoopDetectedError extends Error {
  constructor(message = "A sign-in redirect is already in progress.") {
    super(message);
    this.name = "AuthLoopDetectedError";
  }
}

export function buildPortalLoginUrl(returnTo?: string): string {
  const safeReturnTo = resolveSafePortalReturnTo(returnTo);
  return `${DEFAULT_LOGIN_PATH}?${new URLSearchParams({ returnTo: safeReturnTo }).toString()}`;
}

export function openPortalLogin(returnTo?: string): void {
  if (!isBrowser()) {
    return;
  }
  const loginUrl = buildPortalLoginUrl(returnTo);
  logAuthFlow("openPortalLogin", {
    reason: "embedded_login",
    redirectTarget: resolveSafePortalReturnTo(returnTo),
  });
  if (isEmbeddedPortalContext()) {
    try {
      window.top?.location.assign(loginUrl);
      return;
    } catch {
      window.open(loginUrl, "_blank", "noopener,noreferrer");
      return;
    }
  }
  window.location.assign(loginUrl);
}

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

export function buildAuthRedirectUri(origin: string, redirectOverride = "", redirectMode = ""): string {
  const normalizedOrigin = origin.includes("://127.0.0.1") || origin.includes("://::1")
    ? origin.replace("://127.0.0.1", "://localhost").replace("://::1", "://localhost")
    : origin;
  const derivedRedirectUri = `${normalizedOrigin.replace(/\/+$/, "")}/auth/callback/`;
  return redirectOverride.trim() && redirectMode.trim().toLowerCase() === FIXED_REDIRECT_MODE
    ? redirectOverride.trim()
    : derivedRedirectUri;
}

function buildAuthConfig(): AuthConfig {
  ensureBrowserEnv();
  const domain = (process.env.NEXT_PUBLIC_AUTH0_DOMAIN || "").trim();
  const clientId = (process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "").trim();
  const organizationId = (process.env.NEXT_PUBLIC_AUTH0_ORGANIZATION_ID || "").trim();
  const audience = (process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || "").trim();
  const redirectOverride = (process.env.NEXT_PUBLIC_AUTH0_REDIRECT_URI || "").trim();
  const redirectMode = (process.env.NEXT_PUBLIC_AUTH0_REDIRECT_MODE || "").trim().toLowerCase();
  const redirectUri = buildAuthRedirectUri(window.location.origin, redirectOverride, redirectMode);

  if (!domain || !clientId || !organizationId || !audience || !redirectUri) {
    console.error("[Auth0] configuration incomplete", { domain, clientId, organizationId, audience, redirectUri });
    throw new AuthConfigError(
      "Auth0 configuration is missing. Provide NEXT_PUBLIC_AUTH0_DOMAIN, NEXT_PUBLIC_AUTH0_CLIENT_ID, NEXT_PUBLIC_AUTH0_ORGANIZATION_ID, and NEXT_PUBLIC_AUTH0_AUDIENCE.",
    );
  }

  return { domain, clientId, organizationId, audience, redirectUri };
}

export function resolveSafePortalReturnTo(rawReturnTo?: string | null): string {
  const fallback = DEFAULT_PORTAL_RETURN_TO;
  const value = (rawReturnTo || "").trim();
  if (!value || !isBrowser()) {
    return fallback;
  }
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) {
      return fallback;
    }
    const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return path.startsWith("/") ? path : fallback;
  } catch {
    return fallback;
  }
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
let callbackCompletionPromise: Promise<string> | null = null;
let callbackCompletionKey: string | null = null;
let callbackCompletionResult: { key: string; destination: string } | null = null;
let loginRedirectPromise: Promise<never> | null = null;
let loginRedirectKey: string | null = null;
let rejectedSessionLogoutPromise: Promise<void> | null = null;
const callbackInvocationCounts = new Map<string, number>();

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

function getCallbackCompletionKey() {
  const params = getUrlSearchParams();
  const code = params.get("code") || "";
  const state = params.get("state") || "";
  return code && state ? `${state}\n${code}` : "";
}

function describeCallbackState() {
  const params = getUrlSearchParams();
  const state = params.get("state") || "";
  const key = getCallbackCompletionKey();
  const invocationCount = (callbackInvocationCounts.get(key) ?? 0) + 1;
  callbackInvocationCounts.set(key, invocationCount);
  const auth0StorageKeys = listAuth0StorageKeys();
  return {
    invocationCount,
    hasCode: params.has("code"),
    hasState: Boolean(state),
    stateSuffix: state ? state.slice(-6) : null,
    stateLength: state.length,
    auth0StorageKeys,
    pkceTransactionPresent: auth0StorageKeys.some((storageKey) =>
      /a0\.spajs\.txs|transaction/i.test(storageKey)
    ),
  };
}

function listAuth0StorageKeys(): string[] {
  if (!isBrowser()) {
    return [];
  }
  try {
    const auth0Key = (key: string) => {
      const normalized = key.toLowerCase();
      return normalized.includes("auth0") || normalized.includes("a0.spajs") || normalized.includes("@@auth0spajs@@");
    };
    return [
      ...Object.keys(window.localStorage).filter(auth0Key),
      ...Object.keys(window.sessionStorage).filter(auth0Key),
    ];
  } catch {
    return [];
  }
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
        hasCode: params.has("code"),
        hasState: params.has("state"),
        auth0StorageKeys: listAuth0StorageKeys(),
        redirectUri: getAuthConfig().redirectUri,
      });
    }
    logAuthFlow("handleRedirectCallbackIfNeeded", {
      reason: "callback_params_present",
      hasCode: true,
      hasState: true,
      tokenExists: hasPersistedPortalToken(),
    });
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
  const key = getCallbackCompletionKey();
  const callbackState = describeCallbackState();
  logAuthFlow("completeAuth0Callback", {
    reason: "invoked",
    ...callbackState,
  });
  if (callbackCompletionPromise && callbackCompletionKey === key) {
    logAuthFlow("completeAuth0Callback", {
      reason: "reuse_inflight_callback",
      tokenExists: hasPersistedPortalToken(),
    });
    return callbackCompletionPromise;
  }
  if (callbackCompletionResult?.key === key) {
    logAuthFlow("completeAuth0Callback", {
      reason: "reuse_completed_callback",
      tokenExists: hasPersistedPortalToken(),
      redirectTarget: callbackCompletionResult.destination,
    });
    return callbackCompletionResult.destination;
  }
  callbackCompletionKey = key;
  const promise = completeAuth0CallbackOnce().then((destination) => {
    callbackCompletionResult = { key, destination };
    return destination;
  });
  callbackCompletionPromise = promise;
  try {
    return await promise;
  } catch (error) {
    callbackCompletionResult = null;
    throw error;
  } finally {
    if (callbackCompletionKey === key && callbackCompletionPromise === promise) {
      callbackCompletionKey = null;
      callbackCompletionPromise = null;
    }
  }
}

async function completeAuth0CallbackOnce(): Promise<string> {
  const params = getUrlSearchParams();
  const hasCode = params.has("code");
  const hasState = params.has("state");
  logAuthFlow("completeAuth0Callback", {
    reason: "start",
    hasCode,
    hasState,
    tokenExists: hasPersistedPortalToken(),
  });
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] callback state received", {
      hasState,
      auth0StorageKeys: listAuth0StorageKeys(),
    });
  }
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
  const destination = resolveSafePortalReturnTo(returnTo || storedReturnTo);
  try {
    const token = await waitForToken(
      client.getTokenSilently({
        authorizationParams: {
          audience: getAuthConfig().audience,
        },
      }),
    );
    persistPortalToken(token);
    markFreshAuthCallbackCompleted();
    logAuthFlow("completeAuth0Callback", {
      reason: "token_persisted",
      tokenExists: true,
      ...describeJwtClaims(token),
    });
  } catch (error) {
    console.warn("[Auth0] token bootstrap after callback failed", {
      errorName: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? error.message : "Unknown token bootstrap error",
    });
    if (isInteractiveLoginError(error)) {
      clearLocalInvalidAuthState();
    }
    logAuthFlow("completeAuth0Callback", {
      reason: "token_bootstrap_failed",
      tokenExists: hasPersistedPortalToken(),
    });
    throw new Error("Auth0 callback completed, but no portal access token could be retrieved.");
  }
  if (!hasPersistedPortalToken()) {
    logAuthFlow("completeAuth0Callback", {
      reason: "token_bootstrap_missing",
      tokenExists: false,
    });
    throw new Error("Auth0 callback completed, but no portal access token was persisted.");
  }
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] callback completion summary", {
      hasState,
      returnTo,
      storedReturnTo,
      destination,
    });
  }
  logAuthFlow("completeAuth0Callback", {
    reason: "end",
    redirectTarget: destination,
    tokenExists: hasPersistedPortalToken(),
  });
  return destination;
}

function isInteractiveLoginError(error: unknown) {
  const err = error as { error?: string; error_description?: string; message?: string };
  if (!err || typeof err !== "object") {
    return false;
  }
  const interactiveErrors = new Set([
    "login_required",
    "consent_required",
    "interaction_required",
    "invalid_token",
  ]);
  if (typeof err.error === "string" && interactiveErrors.has(err.error)) {
    return true;
  }
  const message = [err.message, err.error_description].filter(Boolean).join(" ").toLowerCase();
  return (
    message.includes("login required") ||
    message.includes("consent required") ||
    message.includes("interaction required") ||
    message.includes("invalid token") ||
    message.includes("invalid_token")
  );
}

function decodeBase64UrlJson(value: string): Record<string, unknown> | null {
  try {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function describeJwtClaims(token: string): AuthFlowLogFields {
  const payload = decodeBase64UrlJson(token.split(".")[1] || "");
  if (!payload) return { tokenFormat: "opaque" };
  const audience = Array.isArray(payload.aud)
    ? payload.aud.filter((entry): entry is string => typeof entry === "string").join(",")
    : typeof payload.aud === "string"
      ? payload.aud
      : null;
  return {
    tokenFormat: "jwt",
    tokenIssuer: typeof payload.iss === "string" ? payload.iss : null,
    tokenAudience: audience,
    tokenAzp: typeof payload.azp === "string" ? maskSecret(payload.azp, 0, 6) : null,
    tokenOrgId: typeof payload.org_id === "string" ? payload.org_id : null,
    tokenSubjectSuffix: typeof payload.sub === "string" ? payload.sub.slice(-8) : null,
    tokenScope: typeof payload.scope === "string" ? payload.scope : null,
    tokenIssuedAt: typeof payload.iat === "number" ? payload.iat : null,
    tokenExpiresAt: typeof payload.exp === "number" ? payload.exp : null,
  };
}

export function cleanAuthCallbackUrl() {
  if (!isBrowser()) return;
  window.history.replaceState({}, document.title, "/auth/callback/");
}

export function readStoredPortalLoginReturnTo(fallback = "/home/") {
  if (!isBrowser()) return resolveSafePortalReturnTo(fallback);
  try {
    return resolveSafePortalReturnTo(window.sessionStorage.getItem("portal_login_return_to") || fallback);
  } catch {
    return resolveSafePortalReturnTo(fallback);
  }
}

function isLocalDevOrigin() {
  if (!isBrowser() || process.env.NODE_ENV === "production") {
    return false;
  }
  const hostname = window.location.hostname.toLowerCase();
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
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

function readPersistedPortalToken(): string | null {
  const storage = getLocalStorage();
  if (!storage) {
    return null;
  }
  const token = storage.getItem(STORAGE_KEYS.token)?.trim();
  return token || null;
}

export function hasPersistedPortalToken(): boolean {
  return Boolean(readPersistedPortalToken());
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

export function markFreshAuthCallbackCompleted() {
  const storage = getLocalStorage();
  if (!storage) {
    return;
  }
  storage.setItem(FRESH_CALLBACK_STORAGE_KEY, String(Date.now()));
}

export function isFreshAuthCallback(windowMs = 15000): boolean {
  const storage = getLocalStorage();
  if (!storage) {
    return false;
  }
  const timestamp = Number(storage.getItem(FRESH_CALLBACK_STORAGE_KEY));
  return Number.isFinite(timestamp) && Date.now() - timestamp >= 0 && Date.now() - timestamp <= windowMs;
}

export function clearFreshAuthCallbackMarker() {
  getLocalStorage()?.removeItem(FRESH_CALLBACK_STORAGE_KEY);
}

function clearAuth0SdkStorage() {
  if (!isBrowser()) {
    return;
  }
  const shouldRemove = (key: string) => {
    const normalized = key.toLowerCase();
    return normalized.includes("auth0") || normalized.includes("@@auth0spajs@@");
  };
  for (const storage of [window.localStorage, window.sessionStorage]) {
    try {
      for (let index = storage.length - 1; index >= 0; index -= 1) {
        const key = storage.key(index);
        if (key && shouldRemove(key)) {
          storage.removeItem(key);
        }
      }
    } catch (error) {
      console.warn("[Auth0] unable to clear SDK storage", error);
    }
  }
  auth0ClientPromise = null;
}

export function clearPortalAuthStorage(options: { includeAuth0Sdk?: boolean } = {}) {
  const storage = getLocalStorage();
  if (storage) {
    storage.removeItem(STORAGE_KEYS.token);
    storage.removeItem(STORAGE_KEYS.user);
    storage.removeItem(STORAGE_KEYS.authenticated);
  }
  clearPortalCachedStorage();
  if (options.includeAuth0Sdk) {
    clearAuth0SdkStorage();
  }
  redirectHandlingPromise = null;
  callbackCompletionPromise = null;
  callbackCompletionKey = null;
  callbackCompletionResult = null;
}

export function prepareExplicitAuthRetry() {
  clearPortalAuthStorage({ includeAuth0Sdk: true });
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(LOGIN_STARTED_AT_STORAGE_KEY);
    window.sessionStorage.removeItem(AUTH_FLOW_ID_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }
  loginRedirectPromise = null;
  loginRedirectKey = null;
}

function clearLocalInvalidAuthState() {
  if (isLocalDevOrigin()) {
    clearPortalAuthStorage({ includeAuth0Sdk: true });
    return;
  }
  clearPortalAuthStorage();
}

export function clearStalePortalSession(reason = "stale_session") {
  logAuthFlow("clearStalePortalSession", {
    reason,
    tokenExists: hasPersistedPortalToken(),
  });
  clearLocalInvalidAuthState();
}

async function performAuth0LoginRedirect(
  returnTo?: string,
  options: { signup?: boolean; loginHint?: string } = {}
): Promise<never> {
  logAuthFlow("redirectToAuth0Login", {
    reason: "explicit_login_redirect",
    redirectTarget: resolveSafePortalReturnTo(returnTo),
    tokenExists: hasPersistedPortalToken(),
  });
  if (isDevAuthBypassEnabled()) {
    if (isBrowser()) {
      window.location.replace(resolveSafePortalReturnTo(returnTo));
    }
    throw new AuthRedirectError("Dev auth bypass redirect");
  }
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] redirectToAuth0Login invoked", {
      returnTo: resolveSafePortalReturnTo(returnTo),
      origin: isBrowser() ? window.location.origin : "server",
      path: isBrowser() ? window.location.pathname : "server",
    });
  }
  const client = await getAuth0Client();
  clearPortalAuthStorage();
  const config = getAuthConfig();
  const safeReturnTo = resolveSafePortalReturnTo(returnTo);
  if (isBrowser()) {
    try {
      window.sessionStorage.setItem("portal_login_return_to", safeReturnTo);
      window.sessionStorage.setItem(LOGIN_STARTED_AT_STORAGE_KEY, String(Date.now()));
    } catch (error) {
      console.warn("[Auth0] unable to persist returnTo", error);
    }
  }
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] starting login redirect", describeConfig(config));
  }
  try {
    await client.loginWithRedirect({
      appState: { returnTo: safeReturnTo },
      authorizationParams: {
        audience: config.audience,
        redirect_uri: config.redirectUri,
        organization: config.organizationId,
        ...(options.signup ? { screen_hint: "signup" } : {}),
        ...(options.loginHint?.trim() ? { login_hint: options.loginHint.trim().toLowerCase() } : {}),
        prompt: "login",
      },
    });
  } catch (error) {
    console.warn("[Auth0] loginWithRedirect failed", {
      error,
      config: describeConfig(config),
      returnTo: safeReturnTo,
    });
    throw error;
  }
  throw new AuthRedirectError();
}

export async function redirectToAuth0Login(returnTo?: string): Promise<never> {
  const safeReturnTo = resolveSafePortalReturnTo(returnTo);
  const redirectKey = `${isBrowser() ? window.location.origin : "server"}:${safeReturnTo}`;
  if (loginRedirectPromise && loginRedirectKey === redirectKey) {
    logAuthFlow("redirectToAuth0Login", {
      reason: "reuse_inflight_login",
      redirectTarget: safeReturnTo,
    });
    return loginRedirectPromise;
  }
  if (loginRedirectPromise) {
    throw new AuthLoopDetectedError();
  }
  loginRedirectKey = redirectKey;
  loginRedirectPromise = performAuth0LoginRedirect(safeReturnTo).catch((error) => {
    if (!(error instanceof AuthRedirectError)) {
      loginRedirectPromise = null;
      loginRedirectKey = null;
    }
    throw error;
  });
  return loginRedirectPromise;
}

export async function startAuth0Signup(returnTo?: string): Promise<never> {
  const safeReturnTo = resolveSafePortalReturnTo(returnTo);
  const redirectKey = `${isBrowser() ? window.location.origin : "server"}:signup:${safeReturnTo}`;
  if (loginRedirectPromise && loginRedirectKey === redirectKey) {
    return loginRedirectPromise;
  }
  if (loginRedirectPromise) {
    throw new AuthLoopDetectedError();
  }
  loginRedirectKey = redirectKey;
  loginRedirectPromise = performAuth0LoginRedirect(safeReturnTo, { signup: true }).catch((error) => {
    if (!(error instanceof AuthRedirectError)) {
      loginRedirectPromise = null;
      loginRedirectKey = null;
    }
    throw error;
  });
  return loginRedirectPromise;
}

export async function startFacilityRegistrationAuth(
  returnTo: string | undefined,
  options: { email: string; signup: boolean }
): Promise<never> {
  const safeReturnTo = resolveSafePortalReturnTo(returnTo);
  const email = options.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new Error("Enter a valid email address before continuing.");
  }
  const redirectKey = `${isBrowser() ? window.location.origin : "server"}:facility:${options.signup ? "signup" : "login"}:${safeReturnTo}`;
  if (loginRedirectPromise && loginRedirectKey === redirectKey) {
    return loginRedirectPromise;
  }
  if (loginRedirectPromise) {
    throw new AuthLoopDetectedError();
  }
  loginRedirectKey = redirectKey;
  loginRedirectPromise = performAuth0LoginRedirect(safeReturnTo, {
    signup: options.signup,
    loginHint: email,
  }).catch((error) => {
    if (!(error instanceof AuthRedirectError)) {
      loginRedirectPromise = null;
      loginRedirectKey = null;
    }
    throw error;
  });
  return loginRedirectPromise;
}

export async function startAuth0Login(returnTo?: string): Promise<never> {
  logAuthFlow("startAuth0Login", {
    reason: isEmbeddedPortalContext() ? "embedded_login" : "explicit_login",
    redirectTarget: resolveSafePortalReturnTo(returnTo),
    tokenExists: hasPersistedPortalToken(),
  });
  if (isEmbeddedPortalContext()) {
    openPortalLogin(returnTo);
    throw new AuthRedirectError("Opening secure login in a top-level window");
  }
  return redirectToAuth0Login(returnTo);
}

export function logoutRejectedPortalSession(returnTo?: string): Promise<void> {
  if (rejectedSessionLogoutPromise) {
    return rejectedSessionLogoutPromise;
  }

  rejectedSessionLogoutPromise = (async () => {
    if (!isBrowser()) {
      clearPortalAuthStorage({ includeAuth0Sdk: true });
      return;
    }

    const safeReturnTo = resolveSafePortalReturnTo(returnTo);
    const portalEntryUrl = new URL("/portal/", window.location.origin).toString();
    logAuthFlow("logoutRejectedPortalSession", {
      reason: "backend_rejected_session",
      redirectTarget: safeReturnTo,
      tokenExists: hasPersistedPortalToken(),
    });
    clearPortalAuthStorage();

    if (isDevAuthBypassEnabled()) {
      clearPortalAuthStorage({ includeAuth0Sdk: true });
      window.location.assign(buildPortalLoginUrl(safeReturnTo));
      return;
    }

    try {
      const client = await getAuth0Client();
      clearPortalAuthStorage({ includeAuth0Sdk: true });
      await client.logout({
        logoutParams: {
          returnTo: portalEntryUrl,
        },
      });
    } catch (error) {
      clearPortalAuthStorage({ includeAuth0Sdk: true });
      console.warn("[Auth0] rejected-session logout failed, falling back to login redirect", error);
      window.location.assign(buildPortalLoginUrl(safeReturnTo));
    }
  })();

  return rejectedSessionLogoutPromise;
}

export async function logoutPortal(): Promise<void> {
  if (isDevAuthBypassEnabled()) {
    clearPortalAuthStorage();
    if (isBrowser()) {
      window.location.assign(window.location.origin || DEFAULT_LOGOUT_RETURN_TO);
    }
    return;
  }
  clearPortalAuthStorage();
  if (!isBrowser()) {
    return;
  }
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] starting logout", {
      path: window.location.pathname,
    });
  }
  try {
    const client = await getAuth0Client();
    const returnTo = window.location.origin || DEFAULT_LOGOUT_RETURN_TO;
    await client.logout({
      logoutParams: {
        returnTo,
      },
    });
  } catch (error) {
    console.warn("[Auth0] logout failed, falling back to local redirect", error);
    window.location.assign(window.location.origin || DEFAULT_LOGOUT_RETURN_TO);
  }
}

export async function getPortalAccessToken() {
  logAuthFlow("getPortalAccessToken", {
    reason: "start",
    tokenExists: hasPersistedPortalToken(),
  });
  if (isDevAuthBypassEnabled()) {
    persistPortalToken(DEV_ACCESS_TOKEN);
    logAuthFlow("getPortalAccessToken", {
      reason: "dev_bypass",
      tokenExists: true,
      auth0Authenticated: true,
    });
    return DEV_ACCESS_TOKEN;
  }
  const persistedToken = readPersistedPortalToken();
  if (persistedToken) {
    logAuthFlow("getPortalAccessToken", {
      reason: "persisted_token",
      tokenExists: true,
    });
    return persistedToken;
  }

  const client = await getAuth0Client();
  await handleRedirectCallbackIfNeeded();
  const callbackToken = readPersistedPortalToken();
  if (callbackToken) {
    logAuthFlow("getPortalAccessToken", {
      reason: "callback_token",
      tokenExists: true,
    });
    return callbackToken;
  }

  const isAuthenticated = await client.isAuthenticated();
  logAuthFlow("getPortalAccessToken", {
    reason: "auth0_status",
    tokenExists: false,
    auth0Authenticated: isAuthenticated,
  });
  if (DEBUG_AUTH0) {
    console.debug("[Auth0] isAuthenticated?", isAuthenticated);
  }

  if (!isAuthenticated) {
    if (DEBUG_AUTH0) {
      console.debug("[Auth0] not authenticated; token unavailable");
    }
    logAuthFlow("getPortalAccessToken", {
      reason: "no_auth0_session",
      tokenExists: false,
      auth0Authenticated: false,
    });
    return null;
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
    logAuthFlow("getPortalAccessToken", {
      reason: "silent_token",
      tokenExists: true,
      auth0Authenticated: true,
    });
    return token;
  } catch (error) {
    if (DEBUG_AUTH0) {
      console.warn("[Auth0] silent token error", {
        error,
        config: describeConfig(config),
      });
    }
    if (isLocalDevOrigin()) {
      clearLocalInvalidAuthState();
      logAuthFlow("getPortalAccessToken", {
        reason: "silent_token_failed_local",
        tokenExists: false,
        auth0Authenticated: true,
      });
      return null;
    }
    if (isInteractiveLoginError(error)) {
      clearLocalInvalidAuthState();
      logAuthFlow("getPortalAccessToken", {
        reason: "interactive_login_required",
        tokenExists: false,
        auth0Authenticated: true,
      });
      return null;
    }
    throw error;
  }
}

export { AuthConfigError, AuthLoopDetectedError, AuthRedirectError };
