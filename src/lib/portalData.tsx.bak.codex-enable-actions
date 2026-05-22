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
  return useSWR<BrandingSnapshot | null>(
    resolvedOrgId ? ["portal/branding", resolvedOrgId] : null,
    async () => {
      if (!resolvedOrgId) return null;
      return fetchBranding(resolvedOrgId).catch(
        () => sessionBranding
      );
    },
    {
      fallbackData: sessionBranding,
      revalidateIfStale: true,
    }
  );
}

export function usePortalControlSnapshots() {
  const { organizationId } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
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
      fallbackData: { status: null, readiness: null, statusError: null, readinessError: null },
      revalidateIfStale: true,
    }
  );
}

export function usePortalDirectorySnapshot() {
  const { organizationId } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  return useSWR<DirectorySnapshot>(
    resolvedOrgId ? ["portal/directory", resolvedOrgId] : null,
    async () => {
      if (!resolvedOrgId) {
        return {
          users: [],
          facilities: [],
          locationMemberships: [],
          emailLists: [],
          emailListMembersByListId: {},
          partialError: null,
        };
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

      return {
        users: usersResult.status === "fulfilled" ? usersResult.value : [],
        facilities: facilitiesResult.status === "fulfilled" ? facilitiesResult.value : [],
        locationMemberships: membershipsResult.status === "fulfilled" ? membershipsResult.value : [],
        emailLists,
        emailListMembersByListId,
        partialError: partialErrors.length ? partialErrors.join(" | ") : null,
      };
    },
    {
      fallbackData: {
        users: [],
        facilities: [],
        locationMemberships: [],
        emailLists: [],
        emailListMembersByListId: {},
        partialError: null,
      },
      revalidateIfStale: true,
    }
  );
}

export function usePortalEmailListMembers(listId?: string | null) {
  const { organizationId } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  const resolvedListId = ensureOrgId(listId);
  return useSWR<EmailListMemberSummary[]>(
    resolvedOrgId && resolvedListId ? ["portal/email-list-members", resolvedOrgId, resolvedListId] : null,
    async () => {
      if (!resolvedOrgId || !resolvedListId) {
        return [];
      }
      return fetchEmailListMembers(resolvedOrgId, resolvedListId);
    },
    {
      fallbackData: [],
      revalidateIfStale: true,
    }
  );
}

export function usePortalReportsSnapshot() {
  const { organizationId } = usePortalSession();
  const resolvedOrgId = ensureOrgId(organizationId);
  return useSWR<ReportsSnapshot>(
    resolvedOrgId ? ["portal/reports-snapshot", resolvedOrgId] : null,
    async () => {
      if (!resolvedOrgId) {
        return { damageReports: [], rsaReports: [], partialError: null };
      }
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
      return {
        damageReports: damageReportsResult.status === "fulfilled" ? damageReportsResult.value : [],
        rsaReports: rsaReportsResult.status === "fulfilled" ? rsaReportsResult.value : [],
        partialError: partialErrors.length ? partialErrors.join(" | ") : null,
      };
    },
    {
      fallbackData: { damageReports: [], rsaReports: [], partialError: null },
      revalidateIfStale: true,
    }
  );
}
