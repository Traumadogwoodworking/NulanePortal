"use client";

import { mutate as globalMutate } from "swr";
import useSWR, { SWRConfig, useSWRConfig } from "swr";
import { useEffect, useState, type ReactNode } from "react";
import { getPortalFetchDebugSnapshot, PortalSnapshotTimeoutError } from "@/lib/apiClient";
import { usePortalSession } from "@/lib/portalSession";
import { getPortalSuborgValue } from "@/lib/portalOrganizations";
import { fetchBranding } from "@/lib/services/brandingService";
import { fetchControlPlaneBootstrap, fetchOperationsStatus, fetchReadinessStatus } from "@/lib/services/controlPlaneService";
import { FacilitiesAdapter } from "@/lib/services/facilitiesService";
import {
  type DashboardAnalyticsParams,
  type DashboardAnalyticsResponse,
  fetchDashboardAnalytics,
  fetchReportFilterOptions,
  fetchReportList,
  ReportsAdapter,
} from "@/lib/services/reportService";
import {
  fetchHomeAnalyticsSnapshot,
  getHomeAnalyticsSnapshotFilterKey,
  requestHomeAnalyticsSnapshot,
  type HomeAnalyticsSnapshotResponse,
} from "@/lib/services/homeAnalyticsSnapshotService";
import { UsersAdapter } from "@/lib/services/usersService";
import { fetchEmailLists, fetchEmailListMembers } from "@/lib/services/notificationsService";
import {
  BRANDING_CACHE_KEY_PREFIX,
  CONTROL_CACHE_KEY_PREFIX,
  DASHBOARD_ANALYTICS_CACHE_KEY_PREFIX,
  DIRECTORY_CACHE_KEY_PREFIX,
  EMAIL_MEMBERS_CACHE_KEY_PREFIX,
  HOME_ANALYTICS_SNAPSHOT_CACHE_KEY_PREFIX,
  REPORTS_CACHE_KEY_PREFIX,
} from "@/lib/portalCacheStorage";
import type { ControlPlaneBootstrapPayload } from "@/lib/services/controlPlaneService";
import type {
  BrandingSnapshot,
  EmailListMemberSummary,
  EmailListSummary,
  FacilitySummary,
  LocationMembership,
  ReportDamageApiRow,
  RsaReportApiRow,
  UserSummary,
} from "@/lib/types";

const STALE_TIME_MS = 1000 * 60 * 5;
const FOCUS_THROTTLE_MS = 15_000;
const REVALIDATE_ON_FOCUS = false;
const REVALIDATE_ON_RECONNECT = false;
const KEEP_PREVIOUS_DATA = true;
const CACHE_TTL_MS = STALE_TIME_MS;

type CachedPayload<T> = {
  timestamp: number;
  value: T;
};

const directoryMemoryCache = new Map<string, CachedPayload<DirectorySnapshot>>();
const reportsMemoryCache = new Map<string, CachedPayload<ReportsSnapshot>>();
const brandingMemoryCache = new Map<string, CachedPayload<BrandingSnapshot | null>>();
const controlMemoryCache = new Map<string, CachedPayload<ControlSnapshot>>();
const emailMembersMemoryCache = new Map<string, CachedPayload<EmailListMemberSummary[]>>();
const dashboardAnalyticsMemoryCache = new Map<string, CachedPayload<DashboardAnalyticsResponse>>();
const homeAnalyticsSnapshotMemoryCache = new Map<string, CachedPayload<HomeAnalyticsSnapshotResponse>>();
const homeAnalyticsSnapshotInFlight = new Map<string, Promise<HomeAnalyticsSnapshotResponse>>();
const HOME_SNAPSHOT_MAX_ATTEMPTS = 20;
const HOME_SNAPSHOT_MAX_ELAPSED_MS = 45000;

export interface DirectorySnapshot {
  users: UserSummary[];
  facilities: FacilitySummary[];
  locationMemberships: LocationMembership[];
  emailLists: EmailListSummary[];
  emailListMembersByListId: Record<string, EmailListMemberSummary[]>;
  partialError: string | null;
  lastUpdated: string | null;
}

interface ReportsSnapshot {
  damageReports: ReportDamageApiRow[];
  rsaReports: RsaReportApiRow[];
  partialError: string | null;
  damageStatus?: ReportStreamStatus;
  rsaStatus?: ReportStreamStatus;
  lastUpdated?: string | null;
}

type ReportStreamStatus = {
  refreshing: boolean;
  error: string | null;
  lastUpdated: string | null;
};

export type ReportSnapshotKind = "damage" | "rsa";

export function getPortalScopeKey(organizationId?: string | null, sessionId?: string | null) {
  const orgId = ensureOrgId(organizationId);
  const sessionScope = typeof sessionId === "string" && sessionId.trim() ? sessionId.trim() : "anonymous";
  return orgId ? (["portal", sessionScope, orgId] as const) : null;
}

export interface ControlSnapshot {
  status: Awaited<ReturnType<typeof fetchOperationsStatus>> | null;
  readiness: Awaited<ReturnType<typeof fetchReadinessStatus>> | null;
  statusError: string | null;
  readinessError: string | null;
}

export function PortalDataProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        dedupingInterval: STALE_TIME_MS,
        focusThrottleInterval: FOCUS_THROTTLE_MS,
        revalidateOnFocus: REVALIDATE_ON_FOCUS,
        revalidateOnReconnect: REVALIDATE_ON_RECONNECT,
        keepPreviousData: KEEP_PREVIOUS_DATA,
      }}
    >
      {children}
      <PortalFetchDebugPanel />
    </SWRConfig>
  );
}

function PortalFetchDebugPanel() {
  const [enabled, setEnabled] = useState(false);
  const [snapshot, setSnapshot] = useState(() => getPortalFetchDebugSnapshot());

  useEffect(() => {
    function readEnabled() {
      try {
        return typeof window !== "undefined" && window.localStorage.getItem("portalApiTrace") === "1";
      } catch {
        return false;
      }
    }
    setEnabled(readEnabled());
    const interval = window.setInterval(() => {
      setEnabled(readEnabled());
      setSnapshot(getPortalFetchDebugSnapshot());
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (!enabled) return null;
  const oldest = snapshot.active
    .slice()
    .sort((left, right) => right.durationMs - left.durationMs)[0];
  return (
    <pre
      data-portal-fetch-debug-panel
      style={{
        position: "fixed",
        right: 8,
        bottom: 8,
        zIndex: 2147483647,
        maxWidth: 520,
        maxHeight: 360,
        overflow: "auto",
        padding: 8,
        border: "1px solid #999",
        background: "#fff",
        color: "#111",
        fontSize: 11,
        lineHeight: 1.35,
        whiteSpace: "pre-wrap",
      }}
    >
      {JSON.stringify(
        {
          route: typeof window !== "undefined" ? window.location.pathname : null,
          activeCount: snapshot.active.length,
          oldestActive: oldest
            ? {
                requestId: oldest.requestId,
                path: oldest.path,
                callerLabel: oldest.callerLabel,
                phase: oldest.phase,
                durationMs: oldest.durationMs,
                stalePending: oldest.stalePending,
              }
            : null,
          last10: snapshot.history.slice(0, 10).map((entry) => ({
            requestId: entry.requestId,
            method: entry.method,
            path: entry.path,
            callerLabel: entry.callerLabel,
            phase: entry.phase,
            status: entry.status,
            durationMs: entry.durationMs,
            errorName: entry.errorName,
          })),
          last5Errors: snapshot.lastErrors.slice(0, 5).map((entry) => ({
            requestId: entry.requestId,
            path: entry.path,
            phase: entry.phase,
            durationMs: entry.durationMs,
            errorName: entry.errorName,
            errorMessage: entry.errorMessage,
          })),
        },
        null,
        2
      )}
    </pre>
  );
}

function getStorage(storage: "session" | "local") {
  if (typeof window === "undefined") return null;
  return storage === "local" ? window.localStorage : window.sessionStorage;
}

function readCachedPayload<T>(
  memoryCache: Map<string, CachedPayload<T>>,
  storageKey: string,
  orgId: string,
  options?: { allowStale?: boolean; storage?: "session" | "local" }
): T | null {
  const memoryEntry = memoryCache.get(orgId);
  if (memoryEntry && (options?.allowStale || Date.now() - memoryEntry.timestamp <= CACHE_TTL_MS)) {
    return memoryEntry.value;
  }
  const storage = getStorage(options?.storage ?? "session");
  if (!storage) return null;
  try {
    const raw = storage.getItem(`${storageKey}:${orgId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    if (typeof parsed.timestamp !== "number" || !parsed.value) return null;
    if (!options?.allowStale && Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    memoryCache.set(orgId, parsed);
    return parsed.value;
  } catch {
    return null;
  }
}

function writeCachedPayload<T>(
  memoryCache: Map<string, CachedPayload<T>>,
  storageKey: string,
  orgId: string,
  value: T,
  storage: "session" | "local" = "session"
) {
  const payload: CachedPayload<T> = { timestamp: Date.now(), value };
  memoryCache.set(orgId, payload);
  const store = getStorage(storage);
  if (!store) return;
  try {
    store.setItem(`${storageKey}:${orgId}`, JSON.stringify(payload));
  } catch {
    // ignore cache write failures
  }
}

function normalizeDashboardAnalyticsParams(params: DashboardAnalyticsParams = {}): DashboardAnalyticsParams {
  return Object.keys(params)
    .sort()
    .reduce<DashboardAnalyticsParams>((acc, key) => {
      const value = params[key as keyof DashboardAnalyticsParams];
      if (value === undefined || value === null) {
        return acc;
      }
      const stringValue = String(value).trim();
      if (!stringValue) {
        return acc;
      }
      acc[key as keyof DashboardAnalyticsParams] = stringValue;
      return acc;
    }, {});
}

function getDashboardAnalyticsCacheScope(
  organizationId: string,
  userId: string | null | undefined,
  normalizedParams: DashboardAnalyticsParams
): string {
  const userScope = typeof userId === "string" && userId.trim() ? userId.trim() : "anonymous";
  return `${userScope}:${organizationId}:${JSON.stringify(normalizedParams)}`;
}

function hasUsefulDirectoryData(value: DirectorySnapshot | null): boolean {
  return Boolean(
    value &&
      (value.users.length > 0 ||
        value.facilities.length > 0 ||
        value.locationMemberships.length > 0 ||
        value.emailLists.length > 0 ||
        Object.keys(value.emailListMembersByListId).length > 0)
  );
}

function hasUsefulReportsData(value: ReportsSnapshot | null): boolean {
  return Boolean(value && (value.damageReports.length > 0 || value.rsaReports.length > 0));
}

function isAuthorizationFailure(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const status = Number((error as { status?: unknown }).status);
  return status === 401 || status === 403;
}

function emptyReportStreamStatus(): ReportStreamStatus {
  return {
    refreshing: false,
    error: null,
    lastUpdated: null,
  };
}

function normalizeReportsSnapshot(value?: Partial<ReportsSnapshot> | null): ReportsSnapshot {
  return {
    damageReports: value?.damageReports ?? [],
    rsaReports: value?.rsaReports ?? [],
    partialError: value?.partialError ?? null,
    damageStatus: value?.damageStatus ?? emptyReportStreamStatus(),
    rsaStatus: value?.rsaStatus ?? emptyReportStreamStatus(),
    lastUpdated: value?.lastUpdated ?? null,
  };
}

function normalizeRsaOnlyReportsSnapshot(value?: Partial<ReportsSnapshot> | null): ReportsSnapshot {
  const snapshot = normalizeReportsSnapshot(value);
  return finalizeReportsSnapshot({
    ...snapshot,
    damageReports: [],
    damageStatus: emptyReportStreamStatus(),
  });
}

function getReportsPartialError(snapshot: ReportsSnapshot): string | null {
  const errors = [snapshot.damageStatus?.error, snapshot.rsaStatus?.error].filter((entry): entry is string =>
    Boolean(entry)
  );
  return errors.length ? errors.join(" | ") : null;
}

function finalizeReportsSnapshot(value?: Partial<ReportsSnapshot> | null): ReportsSnapshot {
  const snapshot = normalizeReportsSnapshot(value);
  return {
    ...snapshot,
    partialError: getReportsPartialError(snapshot),
  };
}

function formatReportStreamError(kind: ReportSnapshotKind, error: unknown): string {
  const label = kind === "damage" ? "damage reports" : "rsa reports";
  const fallback = kind === "damage" ? "Unable to load damage reports." : "Unable to load RSA reports.";
  return `${label}: ${error instanceof Error ? error.message : fallback}`;
}

function normalizeDirectoryUsers(users: UserSummary[], memberships: LocationMembership[]): UserSummary[] {
  const activeMembershipsByUserId = memberships.reduce<Record<string, Set<string>>>((acc, membership) => {
    if (!membership.user_id || !membership.location_id || membership.is_active === false) {
      return acc;
    }
    const userMemberships = acc[membership.user_id] ?? new Set<string>();
    userMemberships.add(membership.location_id);
    acc[membership.user_id] = userMemberships;
    return acc;
  }, {});
  return users.map((user) => {
    const facilityIds = Array.from(activeMembershipsByUserId[user.id] ?? []);
    const currentFacilityIds = Array.isArray(user.facilityIds) ? user.facilityIds : [];
    const sameFacilityIds =
      facilityIds.length === currentFacilityIds.length &&
      facilityIds.every((facilityId, index) => facilityId === currentFacilityIds[index]);
    if (sameFacilityIds) {
      return user;
    }
    return {
      ...user,
      facilityIds,
    };
  });
}

function ensureOrgId(orgId?: string | null) {
  return typeof orgId === "string" && orgId.trim() ? orgId.trim() : null;
}

export function getControlPlaneBootstrapKey(organizationId?: string | null) {
  const resolvedOrgId = ensureOrgId(organizationId);
  return resolvedOrgId ? (["portal/control-plane/bootstrap", resolvedOrgId] as const) : null;
}

export type PortalDataRefreshTarget =
  | "directory"
  | "branding"
  | "reports"
  | "analytics"
  | "control";

function matchesPortalRefreshTarget(
  key: unknown,
  organizationId: string,
  targets: Set<PortalDataRefreshTarget>
) {
  if (!Array.isArray(key)) return false;
  const first = key[0];
  const containsOrganization = key.some((part) => {
    if (part === organizationId) return true;
    return typeof part === "string" && part.split(":").includes(organizationId);
  });
  if (!containsOrganization) return false;

  if (targets.has("directory")) {
    if (first === "portal/email-list-members") return true;
    if (first === "portal" && key.includes("directory")) return true;
  }
  if (targets.has("branding") && first === "portal" && key.includes("branding")) return true;
  if (targets.has("reports")) {
    if (first === "portal" && key.includes("reports")) return true;
    if (first === "portal/report-list" || first === "portal/report-filter-options") return true;
  }
  if (targets.has("analytics")) {
    if (first === "portal/dashboard-analytics" || first === "portal/home-analytics-snapshot") return true;
  }
  if (targets.has("control")) {
    if (first === "portal/control-plane/bootstrap" || first === "portal/control-snapshot") return true;
  }
  return false;
}

export async function refreshPortalData(
  organizationId: string | null | undefined,
  targets: PortalDataRefreshTarget[] = ["directory", "control"]
) {
  const resolvedOrgId = ensureOrgId(organizationId);
  if (!resolvedOrgId) return undefined;
  const targetSet = new Set(targets);
  return globalMutate((key) => matchesPortalRefreshTarget(key, resolvedOrgId, targetSet));
}

export async function refreshControlPlaneBootstrap(organizationId?: string | null) {
  const key = getControlPlaneBootstrapKey(organizationId);
  if (!key) {
    return null;
  }
  return globalMutate(key);
}

export async function withControlPlaneBootstrapRefresh<T>(
  organizationId: string | null | undefined,
  mutation: () => Promise<T>,
  refresh: (orgId?: string | null) => Promise<unknown> = refreshControlPlaneBootstrap
): Promise<T> {
  const result = await mutation();
  await refresh(organizationId);
  return result;
}

export function useControlPlaneMutation() {
  const { organizationId } = usePortalSession();
  const mutateControlPlaneBootstrap = async <T,>(mutation: () => Promise<T>) =>
    withControlPlaneBootstrapRefresh(organizationId, mutation);
  return {
    refreshControlPlaneBootstrap: () => refreshControlPlaneBootstrap(organizationId),
    mutateControlPlaneBootstrap,
  };
}

export function useControlPlaneBootstrap() {
  const { organizationId } = usePortalSession();
  const { mutate } = useSWRConfig();
  const resolvedOrgId = ensureOrgId(organizationId);
  const swr = useSWR<ControlPlaneBootstrapPayload>(
    getControlPlaneBootstrapKey(resolvedOrgId),
    async () => {
      if (!resolvedOrgId) {
        throw new Error("Organization context required");
      }
      return fetchControlPlaneBootstrap();
    },
    {
      revalidateIfStale: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5_000,
      keepPreviousData: true,
      fallbackData: undefined,
    }
  );

  const refresh = async () => {
    if (!resolvedOrgId) return null;
    return mutate(getControlPlaneBootstrapKey(resolvedOrgId));
  };

  return {
    ...swr,
    refresh,
  };
}

export function usePortalBrandingSnapshot() {
  const { organizationId, session } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const userScope = session?.user?.user_id?.trim() || "anonymous";
  const brandingCacheScope = resolvedOrgId ? `${userScope}:${resolvedOrgId}` : null;
  const sessionBranding = (session?.branding_snapshot as BrandingSnapshot | undefined) ?? null;
  const scope = getPortalScopeKey(resolvedOrgId, userScope);
  const cachedValue = brandingCacheScope
    ? readCachedPayload(brandingMemoryCache, BRANDING_CACHE_KEY_PREFIX, brandingCacheScope, {
        allowStale: true,
        storage: "local",
      })
    : null;
  return useSWR<BrandingSnapshot | null>(
    scope ? [...scope, "branding", "v1"] : null,
    async () => {
      if (!resolvedOrgId) return sessionBranding;
      return fetchBranding(resolvedOrgId);
    },
    {
      fallbackData: cachedValue ?? sessionBranding,
      revalidateIfStale: true,
      onSuccess: (data) => {
        if (brandingCacheScope) {
          writeCachedPayload(brandingMemoryCache, BRANDING_CACHE_KEY_PREFIX, brandingCacheScope, data, "local");
        }
      },
    }
  );
}

export function usePortalControlSnapshots() {
  const { organizationId } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const cachedValue = resolvedOrgId
    ? readCachedPayload(controlMemoryCache, CONTROL_CACHE_KEY_PREFIX, resolvedOrgId, { storage: "local" })
    : null;
  return useSWR<ControlSnapshot>(
    resolvedOrgId ? ["portal/control-snapshot", resolvedOrgId] : null,
    async () => {
      const [statusResult, readinessResult] = await Promise.allSettled([
        fetchOperationsStatus(),
        fetchReadinessStatus(),
      ]);
      return {
        status: statusResult.status === "fulfilled" ? statusResult.value : null,
        readiness: readinessResult.status === "fulfilled" ? readinessResult.value : null,
        statusError:
          statusResult.status === "rejected"
            ? statusResult.reason instanceof Error
              ? statusResult.reason.message
              : "Unable to load backend status."
            : null,
        readinessError:
          readinessResult.status === "rejected"
            ? readinessResult.reason instanceof Error
              ? readinessResult.reason.message
              : "Unable to load readiness status."
            : null,
      };
    },
    {
      fallbackData: cachedValue ?? { status: null, readiness: null, statusError: null, readinessError: null },
      revalidateIfStale: true,
      onSuccess: (data) => {
        if (resolvedOrgId) {
          writeCachedPayload(controlMemoryCache, CONTROL_CACHE_KEY_PREFIX, resolvedOrgId, data, "local");
        }
      },
    }
  );
}

export function usePortalDirectorySnapshot() {
  const { organizationId, selectedOrganizationScopeKey, session } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const userScope = session?.user?.user_id?.trim() || "anonymous";
  const directoryScopeKey = resolvedOrgId
    ? `${userScope}:${resolvedOrgId}:${selectedOrganizationScopeKey}`
    : null;
  const scope = getPortalScopeKey(directoryScopeKey, userScope);
  const cachedValue = directoryScopeKey
    ? readCachedPayload(directoryMemoryCache, DIRECTORY_CACHE_KEY_PREFIX, directoryScopeKey, {
        allowStale: true,
        storage: "local",
      })
    : null;
  const usableCache = hasUsefulDirectoryData(cachedValue);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[portalData] usePortalDirectorySnapshot", {
      organizationId,
      resolvedOrgId,
      selectedOrganizationScopeKey,
      swrKey: directoryScopeKey ? ["portal/directory", directoryScopeKey] : null,
      cachedValuePresent: Boolean(cachedValue),
      usableCache,
    });
  }
  const swr = useSWR<DirectorySnapshot | undefined>(
    scope ? [...scope, "directory", "v2"] : null,
    async () => {
      const previousSnapshot = cachedValue ?? {
        users: [],
        facilities: [],
        locationMemberships: [],
        emailLists: [],
        emailListMembersByListId: {},
        partialError: null,
        lastUpdated: null,
      };
      if (!resolvedOrgId) {
        return previousSnapshot;
      }
      const ENABLE_ADMIN_DATA = true;
      const [usersResult, facilitiesResult, membershipsResult, emailListsResult] = await Promise.allSettled([
        ENABLE_ADMIN_DATA
          ? UsersAdapter.getUsers(resolvedOrgId, selectedOrganizationScopeKey)
          : Promise.resolve([]),
        ENABLE_ADMIN_DATA
          ? FacilitiesAdapter.getFacilities(resolvedOrgId, selectedOrganizationScopeKey)
          : Promise.resolve([]),
        ENABLE_ADMIN_DATA ? UsersAdapter.getLocationMemberships(resolvedOrgId) : Promise.resolve([]),
        fetchEmailLists(resolvedOrgId),
      ]);
      const authorizationRejected = [usersResult, facilitiesResult, membershipsResult, emailListsResult].some(
        (result) => result.status === "rejected" && isAuthorizationFailure(result.reason)
      );
      const partialErrors = [
        usersResult.status === "rejected"
          ? `users: ${usersResult.reason instanceof Error ? usersResult.reason.message : "Unable to load users."}`
          : null,
        facilitiesResult.status === "rejected"
          ? `facilities: ${facilitiesResult.reason instanceof Error ? facilitiesResult.reason.message : "Unable to load facilities."}`
          : null,
        membershipsResult.status === "rejected"
          ? `facility assignments: ${membershipsResult.reason instanceof Error ? membershipsResult.reason.message : "Unable to load facility assignments."}`
          : null,
        emailListsResult.status === "rejected"
          ? `email lists: ${emailListsResult.reason instanceof Error ? emailListsResult.reason.message : "Unable to load email lists."}`
          : null,
      ].filter((entry): entry is string => Boolean(entry));
      if (authorizationRejected) {
        partialErrors.unshift("Access changed; previously cached directory data was cleared.");
      }

      const emailLists = emailListsResult.status === "fulfilled" ? emailListsResult.value : [];
      const emailListMemberResults = await Promise.allSettled(
        emailLists.map(async (list) => ({
          listId: list.email_list_id,
          members: await fetchEmailListMembers(resolvedOrgId, list.email_list_id),
        }))
      );
      const emailListMembersByListId = emailListMemberResults.reduce<Record<string, EmailListMemberSummary[]>>(
        (acc, result, index) => {
          if (result.status === "fulfilled") {
            acc[result.value.listId] = result.value.members;
          } else {
            const listId = emailLists[index]?.email_list_id;
            if (listId) {
              acc[listId] = [];
              partialErrors.push(
                `email list members (${listId}): ${
                  result.reason instanceof Error ? result.reason.message : "Unable to load email list members."
                }`
              );
            }
          }
          return acc;
        },
        {}
      );

      const mergedUsers =
        authorizationRejected ? [] : usersResult.status === "fulfilled" ? usersResult.value : previousSnapshot.users;
      const mergedFacilities =
        authorizationRejected ? [] : facilitiesResult.status === "fulfilled" ? facilitiesResult.value : previousSnapshot.facilities;
      const scopedFacilityIds = new Set(mergedFacilities.map((facility) => facility.id));
      const mergedMemberships = (
        authorizationRejected
          ? []
          : membershipsResult.status === "fulfilled"
          ? membershipsResult.value
          : previousSnapshot.locationMemberships
      ).filter((membership) => scopedFacilityIds.has(membership.location_id));
      const mergedEmailLists =
        authorizationRejected ? [] : emailListsResult.status === "fulfilled" ? emailLists : previousSnapshot.emailLists;
      const mergedEmailListMembers = authorizationRejected
        ? {}
        : emailListsResult.status === "fulfilled"
        ? emailLists.reduce<Record<string, EmailListMemberSummary[]>>((acc, list, index) => {
            const listId = list.email_list_id;
            const memberResult = emailListMemberResults[index];
            acc[listId] = memberResult?.status === "fulfilled"
              ? emailListMembersByListId[listId] ?? []
              : previousSnapshot.emailListMembersByListId[listId] ?? [];
            return acc;
          }, {})
        : previousSnapshot.emailListMembersByListId;

      const snapshot = {
        users: normalizeDirectoryUsers(mergedUsers, mergedMemberships),
        facilities: mergedFacilities,
        locationMemberships: mergedMemberships,
        emailLists: mergedEmailLists,
        emailListMembersByListId: mergedEmailListMembers,
        partialError: partialErrors.length ? partialErrors.join(" | ") : null,
        lastUpdated:
          authorizationRejected ||
          (usersResult.status === "fulfilled" &&
            facilitiesResult.status === "fulfilled" &&
            membershipsResult.status === "fulfilled")
            ? new Date().toISOString()
            : previousSnapshot.lastUpdated,
      };
      if (directoryScopeKey) {
        writeCachedPayload(
          directoryMemoryCache,
          DIRECTORY_CACHE_KEY_PREFIX,
          directoryScopeKey,
          snapshot,
          "local"
        );
      }
      return snapshot;
    },
    {
      fallbackData: usableCache && cachedValue ? cachedValue : undefined,
      keepPreviousData: false,
      revalidateIfStale: true,
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 5_000,
    }
  );
  return {
    ...swr,
    isRefreshing: swr.isLoading || swr.isValidating,
    lastUpdated: swr.data?.lastUpdated ?? cachedValue?.lastUpdated ?? null,
  };
}

export function usePortalEmailListMembers(listId?: string | null) {
  const { organizationId, session } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const resolvedListId = ensureOrgId(listId);
  const userScope = session?.user?.user_id?.trim() || "anonymous";
  const cacheKey = resolvedOrgId && resolvedListId
    ? `${userScope}:${resolvedOrgId}:${resolvedListId}`
    : null;
  const cachedValue = cacheKey
    ? readCachedPayload(emailMembersMemoryCache, EMAIL_MEMBERS_CACHE_KEY_PREFIX, cacheKey, {
        allowStale: true,
        storage: "local",
      })
    : null;
  return useSWR<EmailListMemberSummary[]>(
    resolvedOrgId && resolvedListId
      ? ["portal/email-list-members", userScope, resolvedOrgId, resolvedListId]
      : null,
    async () => {
      if (!resolvedOrgId || !resolvedListId) {
        return cachedValue ?? [];
      }
      return fetchEmailListMembers(resolvedOrgId, resolvedListId);
    },
    {
      fallbackData: cachedValue ?? [],
      revalidateIfStale: true,
      onSuccess: (data) => {
        if (cacheKey) {
          writeCachedPayload(emailMembersMemoryCache, EMAIL_MEMBERS_CACHE_KEY_PREFIX, cacheKey, data, "local");
        }
      },
    }
  );
}

export function usePortalReportsSnapshot() {
  const { organizationId, session } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const userScope = session?.user?.user_id?.trim() || "anonymous";
  const reportsCacheScope = resolvedOrgId ? `${userScope}:${resolvedOrgId}` : null;
  const scope = getPortalScopeKey(resolvedOrgId, userScope);
  const rawCachedValue = reportsCacheScope
    ? readCachedPayload(reportsMemoryCache, REPORTS_CACHE_KEY_PREFIX, reportsCacheScope, {
        storage: "local",
      })
    : null;
  const cachedValue = rawCachedValue ? normalizeRsaOnlyReportsSnapshot(rawCachedValue) : null;
  const usableCache = hasUsefulReportsData(cachedValue);
  const swrKey = scope ? [...scope, "reports", "snapshot", "v4"] : null;
  if (process.env.NODE_ENV !== "production") {
    console.debug("[portalData] usePortalReportsSnapshot", {
      organizationId,
      resolvedOrgId,
      swrKey: resolvedOrgId ? ["portal/reports-snapshot", resolvedOrgId] : null,
      cachedValuePresent: Boolean(cachedValue),
      usableCache,
    });
  }
  return useSWR<ReportsSnapshot | undefined>(
    swrKey,
    async () => {
      if (!resolvedOrgId) {
        return finalizeReportsSnapshot();
      }

      const readLatestSnapshot = () =>
        normalizeRsaOnlyReportsSnapshot(
          readCachedPayload(reportsMemoryCache, REPORTS_CACHE_KEY_PREFIX, reportsCacheScope || resolvedOrgId, {
            allowStale: true,
            storage: "local",
          }) ?? cachedValue
        );
      const publishSnapshot = (snapshot: ReportsSnapshot) => {
        const finalizedSnapshot = normalizeRsaOnlyReportsSnapshot(snapshot);
        writeCachedPayload(
          reportsMemoryCache,
          REPORTS_CACHE_KEY_PREFIX,
          reportsCacheScope || resolvedOrgId,
          finalizedSnapshot,
          "local"
        );
        if (swrKey) {
          void globalMutate(swrKey, finalizedSnapshot, false);
        }
        return finalizedSnapshot;
      };

      const initialSnapshot = readLatestSnapshot();
      const startedSnapshot = publishSnapshot({
        ...initialSnapshot,
        damageReports: [],
        damageStatus: emptyReportStreamStatus(),
        rsaStatus: { ...(initialSnapshot.rsaStatus ?? emptyReportStreamStatus()), refreshing: true, error: null },
      });

      const rsaTask = ReportsAdapter.fetchRsaReports()
        .then((rsaReports) => {
          const latestSnapshot = readLatestSnapshot();
          return publishSnapshot({
            ...latestSnapshot,
            rsaReports,
            rsaStatus: {
              refreshing: false,
              error: null,
              lastUpdated: new Date().toISOString(),
            },
            lastUpdated: new Date().toISOString(),
          });
        })
        .catch((error) => {
          const latestSnapshot = readLatestSnapshot();
          publishSnapshot({
            ...latestSnapshot,
            rsaStatus: {
              ...(latestSnapshot.rsaStatus ?? emptyReportStreamStatus()),
              refreshing: false,
              error: formatReportStreamError("rsa", error),
            },
          });
          throw error;
        });

      await Promise.allSettled([rsaTask]);
      const latestSnapshot = readLatestSnapshot();
      const completedSnapshot = normalizeRsaOnlyReportsSnapshot({
        ...latestSnapshot,
        damageReports: [],
        damageStatus: emptyReportStreamStatus(),
        rsaStatus: {
          ...(latestSnapshot.rsaStatus ?? startedSnapshot.rsaStatus ?? emptyReportStreamStatus()),
          refreshing: false,
        },
      });
      writeCachedPayload(
        reportsMemoryCache,
        REPORTS_CACHE_KEY_PREFIX,
        reportsCacheScope || resolvedOrgId,
        completedSnapshot,
        "local"
      );
      return completedSnapshot;
    },
    {
      fallbackData: cachedValue ?? undefined,
      keepPreviousData: true,
      revalidateIfStale: true,
      revalidateOnMount: !usableCache,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );
}

export function useDashboardAnalyticsSnapshot(params: DashboardAnalyticsParams = {}) {
  const { organizationId, session, selectedOrganizationScopeKey } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const normalizedParams = normalizeDashboardAnalyticsParams({
    ...params,
    suborg: params.suborg ?? getPortalSuborgValue(selectedOrganizationScopeKey),
  });
  const paramsKey = JSON.stringify(normalizedParams);
  const cacheScope = resolvedOrgId
    ? getDashboardAnalyticsCacheScope(resolvedOrgId, session?.user?.user_id ?? null, normalizedParams)
    : null;
  const cachedValue = cacheScope
    ? readCachedPayload(dashboardAnalyticsMemoryCache, DASHBOARD_ANALYTICS_CACHE_KEY_PREFIX, cacheScope, {
        allowStale: true,
        storage: "local",
      })
    : null;
  const key = resolvedOrgId
    ? ["portal/dashboard-analytics", session?.user?.user_id ?? "anonymous", resolvedOrgId, "v2", paramsKey]
    : null;
  const swr = useSWR<DashboardAnalyticsResponse>(
    key,
    async () => {
      const data = await fetchDashboardAnalytics(normalizedParams);
      if (cacheScope) {
        writeCachedPayload(
          dashboardAnalyticsMemoryCache,
          DASHBOARD_ANALYTICS_CACHE_KEY_PREFIX,
          cacheScope,
          data,
          "local"
        );
      }
      return data;
    },
    {
      fallbackData: cachedValue ?? undefined,
      revalidateIfStale: true,
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: STALE_TIME_MS,
      focusThrottleInterval: STALE_TIME_MS,
      keepPreviousData: false,
      onSuccess: (data) => {
        if (cacheScope) {
          writeCachedPayload(
            dashboardAnalyticsMemoryCache,
            DASHBOARD_ANALYTICS_CACHE_KEY_PREFIX,
            cacheScope,
            data,
            "local"
          );
        }
      },
    }
  );
  return {
    ...swr,
    hasCachedData: Boolean(cachedValue),
    normalizedParams,
  };
}

export function useHomeAnalyticsSnapshot(params: DashboardAnalyticsParams = {}) {
  const { organizationId, session, selectedOrganizationScopeKey } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const normalizedParams = normalizeDashboardAnalyticsParams({
    ...params,
    suborg: params.suborg ?? getPortalSuborgValue(selectedOrganizationScopeKey),
  });
  const filterKey = getHomeAnalyticsSnapshotFilterKey(normalizedParams);
  const userScope = session?.user?.user_id ?? "anonymous";
  const cacheScope = resolvedOrgId ? `${userScope}:${resolvedOrgId}:${filterKey}` : null;
  const cachedValue = cacheScope
    ? readCachedPayload(homeAnalyticsSnapshotMemoryCache, HOME_ANALYTICS_SNAPSHOT_CACHE_KEY_PREFIX, cacheScope, {
        allowStale: true,
        storage: "session",
      })
    : null;
  const key = resolvedOrgId
    ? ["portal/home-analytics-snapshot", userScope, resolvedOrgId, "v1", filterKey]
    : null;
  const swr = useSWR<HomeAnalyticsSnapshotResponse>(
    key,
    async () => {
      const inFlightKey = cacheScope ?? filterKey;
      const existing = homeAnalyticsSnapshotInFlight.get(inFlightKey);
      if (existing) return existing;
      const promise = (async () => {
        const startedAt = Date.now();
        let snapshot = await requestHomeAnalyticsSnapshot(normalizedParams);
        let attempts = 0;
        while (
          snapshot?.snapshot_id &&
          (snapshot.status === "queued" || snapshot.status === "running") &&
          attempts < HOME_SNAPSHOT_MAX_ATTEMPTS &&
          Date.now() - startedAt < HOME_SNAPSHOT_MAX_ELAPSED_MS
        ) {
          const delayMs = Math.max(500, Math.min(Number(snapshot.poll_after_ms ?? 1500), 5000));
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          attempts += 1;
          snapshot = await fetchHomeAnalyticsSnapshot(snapshot.snapshot_id, attempts);
        }
        if (snapshot?.snapshot_id && (snapshot.status === "queued" || snapshot.status === "running")) {
          throw new PortalSnapshotTimeoutError({
            snapshotId: snapshot.snapshot_id,
            status: snapshot.status,
            attempts,
            elapsedMs: Date.now() - startedAt,
          });
        }
        return snapshot;
      })().finally(() => {
        homeAnalyticsSnapshotInFlight.delete(inFlightKey);
      });
      homeAnalyticsSnapshotInFlight.set(inFlightKey, promise);
      const snapshot = await promise;
      if (cacheScope && snapshot?.status === "ready") {
        writeCachedPayload(
          homeAnalyticsSnapshotMemoryCache,
          HOME_ANALYTICS_SNAPSHOT_CACHE_KEY_PREFIX,
          cacheScope,
          snapshot,
          "session"
        );
      }
      return snapshot;
    },
    {
      fallbackData: cachedValue ?? undefined,
      revalidateIfStale: true,
      revalidateOnMount: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: STALE_TIME_MS,
      focusThrottleInterval: STALE_TIME_MS,
      keepPreviousData: false,
      onSuccess: (data) => {
        if (cacheScope && data?.status === "ready") {
          writeCachedPayload(
            homeAnalyticsSnapshotMemoryCache,
            HOME_ANALYTICS_SNAPSHOT_CACHE_KEY_PREFIX,
            cacheScope,
            data,
            "session"
          );
        }
      },
    }
  );
  return {
    ...swr,
    hasCachedData: Boolean(cachedValue),
    normalizedParams,
    filterKey,
  };
}

export function useReportListSnapshot(params: Parameters<typeof fetchReportList>[0] = {}) {
  const { organizationId, selectedOrganizationScopeKey, session } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const userScope = session?.user?.user_id?.trim() || "anonymous";
  const requestedPageSize = Number(params.pageSize ?? params.limit ?? 50);
  const pageSize = Number.isFinite(requestedPageSize) ? Math.min(Math.max(Math.floor(requestedPageSize), 1), 50) : 50;
  const effectiveParams = {
    ...params,
    suborg: params.suborg ?? getPortalSuborgValue(selectedOrganizationScopeKey),
    page: params.page ?? 1,
    limit: pageSize,
    pageSize,
  };
  const key = resolvedOrgId
    ? ["portal/report-list", userScope, resolvedOrgId, selectedOrganizationScopeKey, JSON.stringify(effectiveParams)]
    : null;
  return useSWR(key, async () => fetchReportList(effectiveParams), {
    revalidateIfStale: true,
    keepPreviousData: false,
  });
}

export function useReportFilterOptionsSnapshot() {
  const { organizationId, selectedOrganizationScopeKey, session } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const userScope = session?.user?.user_id?.trim() || "anonymous";
  const key = resolvedOrgId
    ? ["portal/report-filter-options", userScope, resolvedOrgId, selectedOrganizationScopeKey]
    : null;
  return useSWR(
    key,
    async () => fetchReportFilterOptions(getPortalSuborgValue(selectedOrganizationScopeKey)),
    {
      keepPreviousData: false,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: STALE_TIME_MS,
    }
  );
}
