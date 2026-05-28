"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ReportsAdapter } from "@/lib/services/reportService";
import { usePortalSession } from "@/lib/portalSession";
import type { ReportDamageApiRow, ReportFilters, RsaReportApiRow } from "@/lib/types";

const PORTAL_REPORTS_CACHE_KEY = "portalReportsCache";
const CACHE_TTL_MS = 1000 * 60 * 3; // 3 minutes
let memoryCache: PortalReportsCache | null = null;

type PortalReportsCache = {
  damageReports: ReportDamageApiRow[];
  rsaReports: RsaReportApiRow[];
  timestamp: number;
};

function readPortalReportsCache(): PortalReportsCache | null {
  if (memoryCache) {
    return memoryCache;
  }
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(PORTAL_REPORTS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PortalReportsCache;
    if (
      !Array.isArray(parsed.damageReports) ||
      !Array.isArray(parsed.rsaReports) ||
      typeof parsed.timestamp !== "number"
    ) {
      return null;
    }
    memoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writePortalReportsCache(damageReports: ReportDamageApiRow[], rsaReports: RsaReportApiRow[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload: PortalReportsCache = {
      damageReports,
      rsaReports,
      timestamp: Date.now(),
    };
    memoryCache = payload;
    window.sessionStorage.setItem(PORTAL_REPORTS_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache write failures
  }
}

function isCacheFresh(cache: PortalReportsCache | null): cache is PortalReportsCache {
  return Boolean(
    cache &&
      Date.now() - cache.timestamp <= CACHE_TTL_MS &&
      (cache.damageReports.length > 0 || cache.rsaReports.length > 0)
  );
}

interface PortalReportsValue {
  damageReports: ReportDamageApiRow[];
  rsaReports: RsaReportApiRow[];
  loading: boolean;
  error: Error | null;
  damageError: Error | null;
  rsaError: Error | null;
  refetch: () => Promise<void>;
}

const PortalReportsContext = createContext<PortalReportsValue | undefined>(undefined);

export function PortalReportsProvider({ children }: { children: ReactNode }) {
  const { organizationId } = usePortalSession();
  const [damageReports, setDamageReports] = useState<ReportDamageApiRow[]>([]);
  const [rsaReports, setRsaReports] = useState<RsaReportApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [damageError, setDamageError] = useState<Error | null>(null);
  const [rsaError, setRsaError] = useState<Error | null>(null);
  const [cacheHydrated, setCacheHydrated] = useState(false);

  if (process.env.NODE_ENV !== "production") {
    console.debug("[portalReports] provider render", {
      organizationId,
      cacheHydrated,
      cachedValuePresent: Boolean(readPortalReportsCache()),
      usableCache: isCacheFresh(readPortalReportsCache()),
    });
  }

  const loadReports = useCallback(async () => {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[portalReports] loadReports invoked", {
        organizationId,
      });
    }
    setLoading(true);
    setError(null);
    setDamageError(null);
    setRsaError(null);
    try {
      const filters: ReportFilters = organizationId
        ? { organization_id: organizationId }
        : {};
      const damagePromise = organizationId
        ? ReportsAdapter.fetchDamageReports(filters)
        : Promise.resolve([] as ReportDamageApiRow[]);
      const [damageResult, rsaResult] = await Promise.allSettled([
        damagePromise,
        ReportsAdapter.fetchRsaReports(),
      ]);
      const damage =
        damageResult.status === "fulfilled"
          ? damageResult.value
          : ([] as ReportDamageApiRow[]);
      const rsa =
        rsaResult.status === "fulfilled"
          ? rsaResult.value
          : ([] as RsaReportApiRow[]);
      setDamageReports(damage);
      setRsaReports(rsa);
      writePortalReportsCache(damage, rsa);
      if (damageResult.status === "rejected") {
        setDamageError(damageResult.reason instanceof Error ? damageResult.reason : new Error("Unable to load damage reports."));
      }
      if (rsaResult.status === "rejected") {
        setRsaError(rsaResult.reason instanceof Error ? rsaResult.reason : new Error("Unable to load RSA reports."));
      }
    } catch (err) {
      console.error("Unable to load portal reports", err);
      const status = err && typeof err === "object" && "status" in err ? (err as { status?: number }).status : undefined;
      if (status === 429) {
        setError(null);
        return;
      }
      setError(err instanceof Error ? err : new Error("Unable to load portal reports"));
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (typeof window === "undefined") {
      setCacheHydrated(true);
      return;
    }
    const cache = readPortalReportsCache();
    if (process.env.NODE_ENV !== "production") {
      console.debug("[portalReports] hydrate cache", {
        organizationId,
        cachedValuePresent: Boolean(cache),
        usableCache: isCacheFresh(cache),
      });
    }
    if (isCacheFresh(cache)) {
      setDamageReports(cache.damageReports);
      setRsaReports(cache.rsaReports);
    }
    setCacheHydrated(true);
  }, []);

  useEffect(() => {
    if (!cacheHydrated) return;
    const cache = readPortalReportsCache();
    if (process.env.NODE_ENV !== "production") {
      console.debug("[portalReports] post-hydration effect", {
        organizationId,
        cachedValuePresent: Boolean(cache),
        usableCache: isCacheFresh(cache),
      });
    }
    if (isCacheFresh(cache)) {
      setError(null);
      setDamageError(null);
      setRsaError(null);
      setLoading(false);
      return;
    }
    void loadReports();
  }, [cacheHydrated, loadReports]);

  const value = useMemo(
    () => ({
      damageReports,
      rsaReports,
      loading,
      error,
      damageError,
      rsaError,
      refetch: loadReports,
    }),
    [damageReports, rsaReports, loading, error, damageError, rsaError, loadReports]
  );

  return (
    <PortalReportsContext.Provider value={value}>
      {children}
    </PortalReportsContext.Provider>
  );
}

export function usePortalReports() {
  return useContext(PortalReportsContext);
}
