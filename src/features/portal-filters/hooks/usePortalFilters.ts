"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import {
  normalizePortalDataQuery,
  parsePortalDataQuery,
  serializePortalDataQuery,
  type PortalDataQuery,
  type PortalDataQueryField,
  type PortalDataQueryIssue,
} from "@/features/portal-filters/query";

export type PortalFilterHistoryMode = "push" | "replace";

export type PortalFilterUpdateOptions = {
  history?: PortalFilterHistoryMode;
  resetPage?: boolean;
};

export type UsePortalFiltersOptions = {
  allowedFields?: readonly PortalDataQueryField[];
  preserveUrlParameters?: readonly string[];
};

type PortalFilterLocationState = {
  query: PortalDataQuery;
  issues: PortalDataQueryIssue[];
};

export type PortalFilterChangeSource = "initial" | "local" | "navigation";

function pageUnsupportedIssue(field: PortalDataQueryField): PortalDataQueryIssue {
  return {
    code: "unsupported_field",
    field,
    message: `The ${field} filter is not supported on this page.`,
  };
}

export function parsePortalFilterLocation(
  search: string,
  options: UsePortalFiltersOptions = {}
): PortalFilterLocationState {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  for (const parameter of options.preserveUrlParameters ?? []) {
    params.delete(parameter);
  }

  const parsed = parsePortalDataQuery(params);
  if (!options.allowedFields?.length) {
    return { query: parsed.query, issues: parsed.issues };
  }

  const allowedFields = new Set<PortalDataQueryField>(options.allowedFields);
  const query = { ...parsed.query };
  const issues = [...parsed.issues];
  for (const field of Object.keys(query) as PortalDataQueryField[]) {
    if (allowedFields.has(field)) continue;
    delete query[field];
    issues.push(pageUnsupportedIssue(field));
  }
  return { query, issues };
}

export function buildPortalFilterUrl(
  pathname: string,
  hash: string,
  query: PortalDataQuery,
  currentSearch = "",
  preserveUrlParameters: readonly string[] = []
): string {
  const params = serializePortalDataQuery(query);
  const currentParams = new URLSearchParams(currentSearch.startsWith("?") ? currentSearch.slice(1) : currentSearch);
  for (const parameter of preserveUrlParameters) {
    for (const value of currentParams.getAll(parameter)) {
      params.append(parameter, value);
    }
  }
  const serialized = params.toString();
  return `${pathname}${serialized ? `?${serialized}` : ""}${hash}`;
}

function readWindowLocation(options: UsePortalFiltersOptions): PortalFilterLocationState {
  if (typeof window === "undefined") return { query: {}, issues: [] };
  return parsePortalFilterLocation(window.location.search, options);
}

function logFilterChange(previous: PortalDataQuery, next: PortalDataQuery) {
  if (process.env.NODE_ENV === "production") return;
  const changedFields = Array.from(
    new Set([...Object.keys(previous), ...Object.keys(next)] as PortalDataQueryField[])
  ).filter((field) => previous[field] !== next[field]);
  console.info("[portal-data] filter changed", {
    changedFields,
    activeFields: Object.keys(next),
  });
}

function logInvalidFilters(issues: PortalDataQueryIssue[]) {
  if (process.env.NODE_ENV === "production" || issues.length === 0) return;
  console.warn("[portal-data] invalid filter rejected", {
    issues: issues.map(({ code, field, parameter }) => ({ code, field, parameter })),
  });
}

export function usePortalFilters(options: UsePortalFiltersOptions = {}) {
  const allowedFieldsKey = (options.allowedFields ?? []).join("|");
  const preservedParametersKey = (options.preserveUrlParameters ?? []).join("|");
  const stableOptions = useMemo<UsePortalFiltersOptions>(
    () => ({
      allowedFields: allowedFieldsKey ? (allowedFieldsKey.split("|") as PortalDataQueryField[]) : undefined,
      preserveUrlParameters: preservedParametersKey ? preservedParametersKey.split("|") : undefined,
    }),
    [allowedFieldsKey, preservedParametersKey]
  );
  const [locationState, setLocationState] = useState<PortalFilterLocationState>(() => readWindowLocation(stableOptions));
  const [lastChangedAt, setLastChangedAt] = useState<string | null>(null);
  const [changeSource, setChangeSource] = useState<PortalFilterChangeSource>("initial");

  useEffect(() => {
    const handlePopState = () => {
      const restored = readWindowLocation(stableOptions);
      setLocationState(restored);
      setChangeSource("navigation");
      setLastChangedAt(new Date().toISOString());
      logInvalidFilters(restored.issues);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [stableOptions]);

  useEffect(() => {
    logInvalidFilters(locationState.issues);
  }, [locationState.issues]);

  const commit = useCallback(
    (next: PortalDataQuery, history: PortalFilterHistoryMode) => {
      const normalized = normalizePortalDataQuery(next);
      if (!normalized.ok) {
        setLocationState((current) => ({ ...current, issues: normalized.issues }));
        logInvalidFilters(normalized.issues);
        return false;
      }
      const previous = locationState.query;
      const nextUrl = buildPortalFilterUrl(
        window.location.pathname,
        window.location.hash,
        normalized.query,
        window.location.search,
        stableOptions.preserveUrlParameters
      );
      const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (nextUrl !== currentUrl) {
        window.history[history === "push" ? "pushState" : "replaceState"](window.history.state, "", nextUrl);
      }
      setLocationState({ query: normalized.query, issues: [] });
      setChangeSource("local");
      setLastChangedAt(new Date().toISOString());
      logFilterChange(previous, normalized.query);
      return true;
    },
    [locationState.query, stableOptions.preserveUrlParameters]
  );

  const updateFilters = useCallback(
    (patch: Partial<PortalDataQuery>, updateOptions: PortalFilterUpdateOptions = {}) => {
      const next = { ...locationState.query, ...patch };
      for (const field of Object.keys(next) as PortalDataQueryField[]) {
        if (next[field] === undefined || next[field] === null || next[field] === "") {
          delete next[field];
        }
      }
      if (updateOptions.resetPage !== false && !("page" in patch)) delete next.page;
      return commit(next, updateOptions.history ?? "replace");
    },
    [commit, locationState.query]
  );

  const setFilter = useCallback(
    <Field extends PortalDataQueryField>(
      field: Field,
      value: PortalDataQuery[Field] | undefined,
      updateOptions?: PortalFilterUpdateOptions
    ) => updateFilters({ [field]: value } as Partial<PortalDataQuery>, updateOptions),
    [updateFilters]
  );

  const resetFilters = useCallback(
    (history: PortalFilterHistoryMode = "push") => commit({}, history),
    [commit]
  );

  return {
    query: locationState.query,
    issues: locationState.issues,
    hasInvalidFilters: locationState.issues.length > 0,
    lastChangedAt,
    changeSource,
    setFilter,
    updateFilters,
    resetFilters,
  };
}
