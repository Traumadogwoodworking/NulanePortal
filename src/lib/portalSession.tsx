"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { fetchPortalSession } from "@/lib/services/sessionService";
import type {
  PortalSessionLocation,
  PortalSessionResponse,
  PortalUserRecord,
} from "@/lib/types";
import type { PermissionKey } from "@/lib/access";
import {
  AuthConfigError,
  AuthRedirectError,
  clearFreshAuthCallbackMarker,
  clearStalePortalSession,
  clearPortalAuthStorage,
  hasPersistedPortalToken,
  isFreshAuthCallback,
  isEmbeddedPortalContext,
  logAuthFlow,
  logoutPortal,
  persistPortalUser,
} from "@/lib/portalAuth";
import {
  getPortalOrganizationScope,
  normalizePortalOrganizationScope,
  PORTAL_ORGANIZATION_SCOPES,
  type PortalOrganizationScope,
  type PortalOrganizationScopeKey,
} from "@/lib/portalOrganizations";
import {
  clearStoredWorkspaceSelection,
  normalizePortalOrganizations,
  persistBackendWorkspaceSelection,
  readStoredWorkspaceOrganizationId,
  selectBackendWorkspace,
} from "@/lib/workspaceSelection";

type PortalSessionStatus =
  | "loading"
  | "authenticating"
  | "success"
  | "unauthenticated"
  | "session_error"
  | "transient-error"
  | "forbidden"
  | "fatal";

type SessionFetchError = Error & { status?: number };

function isSessionFetchError(value: unknown): value is SessionFetchError {
  return (
    typeof value === "object" &&
    value !== null &&
    "status" in value &&
    typeof (value as SessionFetchError).status === "number"
  );
}

const FRESH_CALLBACK_SESSION_RETRY_DELAY_MS = 750;
const SESSION_BACKGROUND_REFRESH_MS = 30_000;
const SESSION_EVENT_REFRESH_THROTTLE_MS = 2_000;

function normalizeRoleKey(value: string | undefined | null): string {
  return value?.toString().trim().toLowerCase().replace(/[\s-]+/g, "_") ?? "";
}

const PortalSessionContext = createContext<PortalSessionContextValue | undefined>(undefined);

interface PortalSessionContextValue {
  status: PortalSessionStatus;
  session: PortalSessionResponse | null;
  user: PortalUserRecord | null;
  error: Error | null;
  refetch: () => void;
  logout: () => Promise<void>;
  hasPermission: (key: PermissionKey) => boolean;
  isAdmin: boolean;
  isOrgAdmin: boolean;
  isFacilityAdmin: boolean;
  isSuperAdmin: boolean;
  organizationId: string | null;
  isPortalAccessAllowed: boolean;
  portalAccess: boolean;
  planTier: string | null;
  requiresAds: boolean;
  locations: PortalSessionLocation[];
  assignedLocationIds: string[];
  selectedLocation: PortalSessionLocation | null;
  selectedLocationId: string | null;
  selectedLocationLabel: string | null;
  locationLocked: boolean;
  switchOrganization: (orgId: string) => void;
  organizationScopes: readonly PortalOrganizationScope[];
  selectedOrganizationScopeKey: PortalOrganizationScopeKey;
  selectedOrganizationScope: PortalOrganizationScope;
  switchOrganizationScope: (key: PortalOrganizationScopeKey) => void;
}

export function PortalSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<PortalSessionStatus>("loading");
  const [session, setSession] = useState<PortalSessionResponse | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [selectedOrganizationScopeKey, setSelectedOrganizationScopeKey] =
    useState<PortalOrganizationScopeKey>("all");
  const freshCallbackRetryCountRef = useRef(0);
  const sessionLoadInFlightRef = useRef<Promise<void> | null>(null);
  const pathname = usePathname() ?? "/";

  const loadSessionRequest = useCallback(async (options: { background?: boolean } = {}) => {
    if (typeof window === "undefined") return;
    logAuthFlow("PortalSessionProvider.loadSession", {
      reason: "start",
      tokenExists: hasPersistedPortalToken(),
    });

    if (!options.background) {
      setStatus("loading");
      setError(null);
    }

    try {
      let payload: PortalSessionResponse;
      let rateLimitRetryCount = 0;
      let workspaceSelectionRetryCount = 0;
      while (true) {
        try {
          payload = await fetchPortalSession();
          break;
        } catch (fetchError: unknown) {
          const fetchStatusCode = isSessionFetchError(fetchError) ? fetchError.status : undefined;
          const tokenExists = hasPersistedPortalToken();
          const shouldRetryStaleWorkspace =
            fetchStatusCode === 403 &&
            Boolean(readStoredWorkspaceOrganizationId()) &&
            workspaceSelectionRetryCount < 1;
          const shouldRetryRateLimit = fetchStatusCode === 429 && rateLimitRetryCount < 2;
          const shouldRetryFreshCallback =
            fetchStatusCode === 401 &&
            tokenExists &&
            isFreshAuthCallback() &&
            freshCallbackRetryCountRef.current < 2;
          if (shouldRetryStaleWorkspace) {
            workspaceSelectionRetryCount += 1;
            clearStoredWorkspaceSelection();
            logAuthFlow("PortalSessionProvider.loadSession", {
              reason: "stale_workspace_selection_retry",
              httpStatus: 403,
              status: "authenticating",
              tokenExists,
              redirectTarget: pathname,
              retryCount: workspaceSelectionRetryCount,
            });
            if (!options.background) setStatus("authenticating");
            continue;
          }
          if (shouldRetryRateLimit) {
            const retryDelayMs = rateLimitRetryCount === 0 ? 1000 : 3000;
            rateLimitRetryCount += 1;
            logAuthFlow("PortalSessionProvider.loadSession", {
              reason: "session_429_retry",
              httpStatus: 429,
              status: options.background ? "success" : "authenticating",
              tokenExists,
              redirectTarget: pathname,
              retryCount: rateLimitRetryCount,
            });
            if (!options.background) setStatus("authenticating");
            await new Promise((resolve) => window.setTimeout(resolve, retryDelayMs));
            continue;
          }
          if (!shouldRetryFreshCallback) throw fetchError;

          freshCallbackRetryCountRef.current += 1;
          logAuthFlow("PortalSessionProvider.loadSession", {
            reason: "fresh_callback_session_401_retry",
            httpStatus: 401,
            status: "authenticating",
            tokenExists,
            redirectTarget: pathname,
            retryCount: freshCallbackRetryCountRef.current,
          });
          setStatus("authenticating");
          await new Promise((resolve) => {
            window.setTimeout(resolve, FRESH_CALLBACK_SESSION_RETRY_DELAY_MS);
          });
        }
      }
      const organizations = normalizePortalOrganizations(payload.organizations);
      const activeOrganizationId = (
        payload.organization?.organization_id || payload.user?.organization_id || ""
      ).trim();
      payload = { ...payload, organizations };
      persistBackendWorkspaceSelection(organizations, activeOrganizationId);
      persistPortalUser(payload.user);
      localStorage.removeItem("portalMockOrgId");
      localStorage.removeItem("portalMockOrgName");
      const organizationResolved = Boolean(
        payload.organization?.organization_id || payload.user?.organization_id
      );
      if (!organizationResolved) {
        setSession(payload);
        setError(new Error("Signed in, but no portal organization was resolved for this account."));
        setStatus("session_error");
        logAuthFlow("PortalSessionProvider.loadSession", {
          reason: "missing_organization",
          status: "session_error",
          tokenExists: hasPersistedPortalToken(),
          organizationResolved: false,
        });
        return;
      }
      setSession(payload);
      clearFreshAuthCallbackMarker();
      freshCallbackRetryCountRef.current = 0;
      setStatus("success");
      logAuthFlow("PortalSessionProvider.loadSession", {
        reason: "success",
        status: "success",
        tokenExists: hasPersistedPortalToken(),
        organizationResolved,
      });
    } catch (err: unknown) {
      if (err instanceof AuthRedirectError) {
        logAuthFlow("PortalSessionProvider.loadSession", {
          reason: "auth_redirect_error",
          status: "unauthenticated",
          tokenExists: hasPersistedPortalToken(),
        });
        setStatus("unauthenticated");
        return;
      }
      if (err instanceof AuthConfigError) {
        if (options.background) return;
        setError(err);
        setStatus("fatal");
        return;
      }
      const statusCode = isSessionFetchError(err) ? err.status : undefined;
      if (statusCode === 403) {
        const forbiddenError =
          err instanceof Error
            ? err
            : new Error("Your account is not authorized for this portal.");
        setError(forbiddenError);
        setStatus("forbidden");
        return;
      }
      if (statusCode === 401) {
        const tokenExists = hasPersistedPortalToken();
        freshCallbackRetryCountRef.current = 0;
        if (!tokenExists) {
          clearStalePortalSession("session_401");
        }
        clearFreshAuthCallbackMarker();
        logAuthFlow("PortalSessionProvider.loadSession", {
          reason: "session_401",
          httpStatus: 401,
          tokenExists,
          redirectTarget: pathname,
        });
        setSession(null);
        setError(
          new Error(
            tokenExists
              ? "Signed in, but the portal API rejected this account session."
              : "No active portal session was found."
          )
        );
        if (isEmbeddedPortalContext()) {
          setStatus("unauthenticated");
          return;
        }
        if (tokenExists) {
          setStatus("session_error");
          return;
        }
        if (pathname === "/") {
          setStatus("unauthenticated");
          return;
        }
        setStatus("unauthenticated");
        return;
      }
      const normalizedError =
        err instanceof Error ? err : new Error("Unable to load your session.");
      if (options.background) {
        logAuthFlow("PortalSessionProvider.loadSession", {
          reason: "background_refresh_failed",
          status: "success",
          tokenExists: hasPersistedPortalToken(),
        });
        return;
      }
      setError(normalizedError);
      setStatus("transient-error");
    }
  }, [pathname]);

  const loadSession = useCallback(async (options: { background?: boolean } = {}) => {
    const inFlight = sessionLoadInFlightRef.current;
    if (inFlight) {
      await inFlight;
      return;
    }

    const request = loadSessionRequest(options);
    sessionLoadInFlightRef.current = request;
    try {
      await request;
    } finally {
      if (sessionLoadInFlightRef.current === request) {
        sessionLoadInFlightRef.current = null;
      }
    }
  }, [loadSessionRequest]);

  const switchOrganization = useCallback((orgId: string) => {
    selectBackendWorkspace(session?.organizations, orgId);
    setStatus("loading");
    setSession(null);
    window.location.reload();
  }, [session?.organizations]);

  const organizationScopeStorageKey = useMemo(() => {
    const userId = session?.user?.user_id?.trim();
    const organizationId = (
      session?.organization?.organization_id || session?.user?.organization_id || ""
    ).trim();
    return userId && organizationId
      ? `portalOrganizationScopeV2:${userId}:${organizationId}`
      : null;
  }, [session?.organization?.organization_id, session?.user?.organization_id, session?.user?.user_id]);

  useEffect(() => {
    const sessionScope = normalizePortalOrganizationScope(session?.organization?.suborg);
    const storedScope =
      typeof window === "undefined" || !organizationScopeStorageKey
        ? null
        : normalizePortalOrganizationScope(window.sessionStorage.getItem(organizationScopeStorageKey));
    setSelectedOrganizationScopeKey(sessionScope ?? storedScope ?? "all");
  }, [organizationScopeStorageKey, session?.organization?.suborg]);

  const switchOrganizationScope = useCallback((key: PortalOrganizationScopeKey) => {
    const normalized = normalizePortalOrganizationScope(key);
    if (!normalized) return;
    setSelectedOrganizationScopeKey(normalized);
    if (typeof window !== "undefined" && organizationScopeStorageKey) {
      window.sessionStorage.setItem(organizationScopeStorageKey, normalized);
    }
  }, [organizationScopeStorageKey]);

  useEffect(() => {
    const t = setTimeout(() => {
      void loadSession();
    }, 0);
    return () => clearTimeout(t);
  }, [loadSession]);

  useEffect(() => {
    if (status !== "success") return;
    let lastRefreshAt = 0;
    const refreshSession = () => {
      if (document.visibilityState === "hidden") return;
      const now = Date.now();
      if (now - lastRefreshAt < SESSION_EVENT_REFRESH_THROTTLE_MS) return;
      lastRefreshAt = now;
      void loadSession({ background: true });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshSession();
    };
    const intervalId = window.setInterval(refreshSession, SESSION_BACKGROUND_REFRESH_MS);
    window.addEventListener("focus", refreshSession);
    window.addEventListener("online", refreshSession);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshSession);
      window.removeEventListener("online", refreshSession);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loadSession, status]);

  const value = useMemo(() => {
    const sessionRoles = [
      normalizeRoleKey(session?.user?.role),
      normalizeRoleKey(session?.user?.organization_membership?.role),
    ].filter(Boolean);
    const hasSessionRole = (role: string) => sessionRoles.includes(role);
    const isSuperAdmin = hasSessionRole("super_admin") || hasSessionRole("superadmin");
    const isOrgAdmin = hasSessionRole("org_admin") || hasSessionRole("orgadmin") || isSuperAdmin;
    const isFacilityAdmin = hasSessionRole("facility_admin") || hasSessionRole("facilityadmin") || isOrgAdmin;
    const isAdmin = session?.is_admin === true || hasSessionRole("admin") || isSuperAdmin;
    const permissions: string[] = Array.isArray(session?.user?.permissions)
      ? session.user.permissions.map((permission) => permission.toString())
      : [];
    const organizationId =
      session?.organization?.organization_id ||
      session?.user?.organization_id ||
      null;
    const assignedLocations = [
      session?.locations,
      session?.facilities,
      session?.available_locations,
      session?.availableLocations,
      session?.available_facilities,
      session?.availableFacilities,
    ].flatMap((locations) => (Array.isArray(locations) ? locations : []));
    const accessibleLocations = Array.from(
      new Map(
        assignedLocations
          .filter((location) => location.location_id && location.is_active !== false)
          .map((location) => [location.location_id, location])
      ).values()
    );
    const directLocationMemberships = [
      ...(Array.isArray(session?.user?.location_memberships) ? session.user.location_memberships : []),
      ...(Array.isArray(session?.scope?.location_memberships) ? session.scope.location_memberships : []),
    ];
    const membershipLocationIds = Array.from(new Set(
      directLocationMemberships
        .filter((membership) => membership?.is_active !== false)
        .map((membership) => membership?.location_id?.toString().trim() ?? "")
        .filter(Boolean)
    ));
    const restrictedScopeLocationIds =
      session?.facilityScope?.mode === "restricted" && Array.isArray(session.facilityScope.allowedLocationIds)
        ? session.facilityScope.allowedLocationIds.map((locationId) => locationId.toString().trim()).filter(Boolean)
        : [];
    const assignedLocationIds = membershipLocationIds.length
      ? membershipLocationIds
      : Array.from(new Set(restrictedScopeLocationIds));
    const assignedLocationIdSet = new Set(assignedLocationIds);
    const directlyAssignedLocations = accessibleLocations.filter((location) =>
      assignedLocationIdSet.has(location.location_id)
    );
    const selectedLocation = session?.selected_location ?? session?.selectedLocation ?? null;
    const selectedLocationId = selectedLocation?.location_id
      ? selectedLocation.location_id.toString()
      : null;
    const selectedLocationLabel =
      selectedLocation?.location_label ||
      selectedLocation?.display_name ||
      selectedLocation?.location_name ||
      null;
    const locationLocked = Boolean(session?.location_locked ?? session?.scope?.location_locked);
    const planTier = session?.plan_tier ?? null;
    const requiresAds = Boolean(session?.requires_ads);
    const portalAccess = session?.portal_access ?? true;
    const selectedOrganizationScope = getPortalOrganizationScope(selectedOrganizationScopeKey);

    const hasPermission = (key: PermissionKey) => {
      if (isAdmin || isOrgAdmin) {
        return true;
      }
      return permissions.includes(key);
    };

    return {
      status,
      session,
      user: session?.user ?? null,
      error,
      refetch: loadSession,
      logout: logoutPortal,
      hasPermission,
      isAdmin,
      isOrgAdmin,
      isFacilityAdmin,
      isSuperAdmin,
      organizationId,
      isPortalAccessAllowed: portalAccess,
      portalAccess,
      planTier,
      requiresAds,
      locations: accessibleLocations,
      assignedLocationIds,
      selectedLocation,
      selectedLocationId,
      selectedLocationLabel,
      locationLocked,
      switchOrganization,
      organizationScopes: PORTAL_ORGANIZATION_SCOPES,
      selectedOrganizationScopeKey,
      selectedOrganizationScope,
      switchOrganizationScope,
    };
  }, [
    status,
    session,
    error,
    loadSession,
    switchOrganization,
    selectedOrganizationScopeKey,
    switchOrganizationScope,
  ]);

  return (
    <PortalSessionContext.Provider value={value}>
      {children}
    </PortalSessionContext.Provider>
  );
}

export function usePortalSession() {
  const context = useContext(PortalSessionContext);
  if (!context) {
    throw new Error("usePortalSession must be used within a PortalSessionProvider");
  }
  return context;
}
