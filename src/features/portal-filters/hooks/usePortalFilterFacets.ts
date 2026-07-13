"use client";

import useSWR from "swr";
import { usePortalSession } from "@/lib/portalSession";
import { fetchPortalFilterFacets } from "@/features/portal-filters/services/portalFilterFacetsService";
import type { PortalFilterFacetsResponse } from "@/features/portal-filters/model/facets";

const FILTER_FACETS_DEDUPING_INTERVAL_MS = 5 * 60 * 1000;

type ScopedPortalFilterFacets = {
  scopeId: string;
  response: PortalFilterFacetsResponse;
};

function normalizeScopePart(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function getPortalFilterFacetsKey(
  userId: string | null | undefined,
  organizationId: string | null | undefined,
) {
  const normalizedUserId = normalizeScopePart(userId);
  const normalizedOrganizationId = normalizeScopePart(organizationId);
  return normalizedUserId && normalizedOrganizationId
    ? (["portal/filter-facets", normalizedUserId, normalizedOrganizationId, "v1"] as const)
    : null;
}

export function usePortalFilterFacets() {
  const { user, organizationId } = usePortalSession();
  const key = getPortalFilterFacetsKey(user?.user_id, organizationId);
  const scopeId = key ? `${key[1]}:${key[2]}` : null;
  const swr = useSWR<ScopedPortalFilterFacets>(
    key,
    async () => ({
      scopeId: scopeId as string,
      response: await fetchPortalFilterFacets(),
    }),
    {
      keepPreviousData: true,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: FILTER_FACETS_DEDUPING_INTERVAL_MS,
    },
  );

  const data = scopeId && swr.data?.scopeId === scopeId ? swr.data.response : undefined;

  return {
    data,
    error: swr.error,
    isLoading: swr.isLoading && !data,
    isValidating: swr.isValidating,
    mutate: async () => {
      const next = await swr.mutate();
      return next?.scopeId === scopeId ? next.response : undefined;
    },
  };
}

