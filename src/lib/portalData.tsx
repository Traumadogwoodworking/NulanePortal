"use client";

import { mutate as globalMutate } from "swr";
import useSWR, { SWRConfig, useSWRConfig } from "swr";
import type { ReactNode } from "react";
import { usePortalSession } from "@/lib/portalSession";
import { fetchBranding } from "@/lib/services/brandingService";
import { fetchControlPlaneBootstrap, fetchOperationsStatus, fetchReadinessStatus } from "@/lib/services/controlPlaneService";
import { FacilitiesAdapter } from "@/lib/services/facilitiesService";
import { ReportsAdapter } from "@/lib/services/reportService";
import { UsersAdapter } from "@/lib/services/usersService";
import { fetchEmailLists, fetchEmailListMembers } from "@/lib/services/notificationsService";
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
const REVALIDATE_ON_FOCUS = false;
const REVALIDATE_ON_RECONNECT = true;
const KEEP_PREVIOUS_DATA = true;
const DIRECTORY_CACHE_KEY_PREFIX = "portalDirectoryCache";
const BRANDING_CACHE_KEY_PREFIX = "portalBrandingCache";
const REPORTS_CACHE_KEY_PREFIX_V2 = "portalReportsSnapshotCacheV2";
const REPORTS_CACHE_KEY_PREFIX = "portalReportsSnapshotCache";
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

interface DirectorySnapshot {
  users: UserSummary[];
  facilities: FacilitySummary[];
  locationMemberships: LocationMembership[];
  emailLists: EmailListSummary[];
  emailListMembersByListId: Record<string, EmailListMemberSummary[]>;
  partialError: string | null;
}

interface ReportsSnapshot {
  damageReports: ReportDamageApiRow[];
  rsaReports: RsaReportApiRow[];
  partialError: string | null;
}

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
        focusThrottleInterval: STALE_TIME_MS,
        revalidateOnFocus: REVALIDATE_ON_FOCUS,
        revalidateOnReconnect: REVALIDATE_ON_RECONNECT,
        keepPreviousData: KEEP_PREVIOUS_DATA,
      }}
    >
      {children}
    </SWRConfig>
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
  const sessionBranding = (session?.branding_snapshot as BrandingSnapshot | undefined) ?? null;
  const scope = getPortalScopeKey(resolvedOrgId, session?.user?.user_id ?? null);
  const cachedValue = resolvedOrgId
    ? readCachedPayload(brandingMemoryCache, BRANDING_CACHE_KEY_PREFIX, resolvedOrgId, {
        allowStale: true,
        storage: "local",
      })
    : null;
  return useSWR<BrandingSnapshot | null>(
    scope ? [...scope, "branding", "v1"] : null,
    async () => {
      if (!resolvedOrgId) return sessionBranding;
      return fetchBranding(resolvedOrgId).catch(() => cachedValue ?? sessionBranding);
    },
    {
      fallbackData: cachedValue ?? sessionBranding,
      revalidateIfStale: true,
      onSuccess: (data) => {
        if (resolvedOrgId) {
          writeCachedPayload(brandingMemoryCache, BRANDING_CACHE_KEY_PREFIX, resolvedOrgId, data, "local");
        }
      },
    }
  );
}

const CONTROL_CACHE_KEY_PREFIX = "portalControlCache";

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
  const { organizationId } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const scope = getPortalScopeKey(resolvedOrgId, null);
  const cachedValue = resolvedOrgId
    ? readCachedPayload(directoryMemoryCache, DIRECTORY_CACHE_KEY_PREFIX, resolvedOrgId, {
        allowStale: true,
        storage: "local",
      })
    : null;
  const usableCache = hasUsefulDirectoryData(cachedValue);
  if (process.env.NODE_ENV !== "production") {
    console.debug("[portalData] usePortalDirectorySnapshot", {
      organizationId,
      resolvedOrgId,
      swrKey: resolvedOrgId ? ["portal/directory", resolvedOrgId] : null,
      cachedValuePresent: Boolean(cachedValue),
      usableCache,
    });
  }
  return useSWR<DirectorySnapshot | undefined>(
    scope ? [...scope, "directory", "v1"] : null,
    async () => {
      const previousSnapshot = cachedValue ?? {
        users: [],
        facilities: [],
        locationMemberships: [],
        emailLists: [],
        emailListMembersByListId: {},
        partialError: null,
      };
      if (!resolvedOrgId) {
        return previousSnapshot;
      }
      const ENABLE_ADMIN_DATA = true;
      const [usersResult, facilitiesResult, membershipsResult, emailListsResult] = await Promise.allSettled([
        ENABLE_ADMIN_DATA ? UsersAdapter.getUsers(resolvedOrgId) : Promise.resolve([]),
        ENABLE_ADMIN_DATA ? FacilitiesAdapter.getFacilities(resolvedOrgId) : Promise.resolve([]),
        ENABLE_ADMIN_DATA ? UsersAdapter.getLocationMemberships(resolvedOrgId) : Promise.resolve([]),
        fetchEmailLists(resolvedOrgId),
      ]);
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

      const mergedUsers = mergeById(
        previousSnapshot.users,
        usersResult.status === "fulfilled" ? usersResult.value : []
      );
      const mergedFacilities = mergeById(
        previousSnapshot.facilities,
        facilitiesResult.status === "fulfilled" ? facilitiesResult.value : []
      );
      const mergedMemberships = mergeByKey(
        previousSnapshot.locationMemberships,
        membershipsResult.status === "fulfilled" ? membershipsResult.value : [],
        (m) => m.location_membership_id
      );
      const mergedEmailLists = mergeByKey(previousSnapshot.emailLists, emailLists, (l) => l.email_list_id);
      const mergedEmailListMembers = mergeEmailListMembers(
        previousSnapshot.emailListMembersByListId,
        emailListMembersByListId
      );

      const snapshot = {
        users: normalizeDirectoryUsers(mergedUsers, mergedMemberships),
        facilities: mergedFacilities,
        locationMemberships: mergedMemberships,
        emailLists: mergedEmailLists,
        emailListMembersByListId: mergedEmailListMembers,
        partialError: partialErrors.length ? partialErrors.join(" | ") : null,
      };
      writeCachedPayload(directoryMemoryCache, DIRECTORY_CACHE_KEY_PREFIX, resolvedOrgId, snapshot, "local");
      return snapshot;
    },
    {
      fallbackData: usableCache && cachedValue ? cachedValue : undefined,
      revalidateIfStale: !usableCache,
    }
  );
}

const EMAIL_MEMBERS_CACHE_KEY_PREFIX = "portalEmailMembersCache";

export function usePortalEmailListMembers(listId?: string | null) {
  const { organizationId } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const resolvedListId = ensureOrgId(listId);
  const cacheKey = resolvedOrgId && resolvedListId ? `${resolvedOrgId}:${resolvedListId}` : null;
  const cachedValue = cacheKey
    ? readCachedPayload(emailMembersMemoryCache, EMAIL_MEMBERS_CACHE_KEY_PREFIX, cacheKey, {
        allowStale: true,
        storage: "local",
      })
    : null;
  return useSWR<EmailListMemberSummary[]>(
    resolvedOrgId && resolvedListId ? ["portal/email-list-members", resolvedOrgId, resolvedListId] : null,
    async () => {
      if (!resolvedOrgId || !resolvedListId) {
        return cachedValue ?? [];
      }
      return fetchEmailListMembers(resolvedOrgId, resolvedListId).catch(() => cachedValue ?? []);
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

function mergeCachedReports<T extends { report_id?: string; id?: string }>(
  cached: T[],
  fresh: T[]
): T[] {
  const map = new Map<string, T>();
  cached.forEach((item) => {
    const id = (item.report_id || item.id) as string | undefined;
    if (id) map.set(id, item);
  });
  fresh.forEach((item) => {
    const id = (item.report_id || item.id) as string | undefined;
    if (id) map.set(id, item);
  });
  return Array.from(map.values());
}

function mergeById<T extends { id?: string }>(cached: T[], fresh: T[]): T[] {
  const map = new Map<string, T>();
  cached.forEach((item) => {
    if (item.id) map.set(item.id, item);
  });
  fresh.forEach((item) => {
    if (item.id) map.set(item.id, item);
  });
  return Array.from(map.values());
}

function mergeByKey<T>(cached: T[], fresh: T[], keyFn: (item: T) => string | undefined): T[] {
  const map = new Map<string, T>();
  cached.forEach((item) => {
    const key = keyFn(item);
    if (key) map.set(key, item);
  });
  fresh.forEach((item) => {
    const key = keyFn(item);
    if (key) map.set(key, item);
  });
  return Array.from(map.values());
}

function mergeEmailListMembers(
  cached: Record<string, EmailListMemberSummary[]>,
  fresh: Record<string, EmailListMemberSummary[]>
): Record<string, EmailListMemberSummary[]> {
  const merged = { ...cached };
  Object.entries(fresh).forEach(([listId, members]) => {
    merged[listId] = mergeByKey(cached[listId] ?? [], members, (m) => m.email_list_member_id || m.user_id);
  });
  return merged;
}

export function usePortalReportsSnapshot() {
  const { organizationId } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const scope = getPortalScopeKey(resolvedOrgId, null);
  const cachedValue = resolvedOrgId
    ? readCachedPayload(reportsMemoryCache, REPORTS_CACHE_KEY_PREFIX_V2, resolvedOrgId, {
        allowStale: true,
        storage: "local",
      })
    : null;
  const usableCache = hasUsefulReportsData(cachedValue);
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
    scope ? [...scope, "reports", "snapshot", "v2"] : null,
    async () => {
      if (!resolvedOrgId) {
        return { damageReports: [], rsaReports: [], partialError: null };
      }
      const previousSnapshot = cachedValue ?? { damageReports: [], rsaReports: [], partialError: null };
      const [damageReportsResult, rsaReportsResult] = await Promise.allSettled([
        ReportsAdapter.fetchDamageReports({ organization_id: resolvedOrgId }),
        ReportsAdapter.fetchRsaReports(),
      ]);
      const partialErrors = [
        damageReportsResult.status === "rejected"
          ? `damage reports: ${damageReportsResult.reason instanceof Error ? damageReportsResult.reason.message : "Unable to load damage reports."}`
          : null,
        rsaReportsResult.status === "rejected"
          ? `rsa reports: ${rsaReportsResult.reason instanceof Error ? rsaReportsResult.reason.message : "Unable to load RSA reports."}`
          : null,
      ].filter((entry): entry is string => Boolean(entry));
      const snapshot = {
        damageReports: mergeCachedReports(
          previousSnapshot.damageReports,
          damageReportsResult.status === "fulfilled" ? damageReportsResult.value : []
        ),
        rsaReports: mergeCachedReports(
          previousSnapshot.rsaReports,
          rsaReportsResult.status === "fulfilled" ? rsaReportsResult.value : []
        ),
        partialError: partialErrors.length ? partialErrors.join(" | ") : null,
      };
      writeCachedPayload(reportsMemoryCache, REPORTS_CACHE_KEY_PREFIX_V2, resolvedOrgId, snapshot, "local");
      return snapshot;
    },
    {
      fallbackData: cachedValue ?? undefined,
      keepPreviousData: true,
      revalidateIfStale: !usableCache,
      revalidateOnMount: !usableCache,
    }
  );
}
