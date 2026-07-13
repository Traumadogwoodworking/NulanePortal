import type {
  PortalFilterFacets,
  PortalFilterOption,
} from "@/features/portal-filters/model/facets";

import type { PortalDataQuery, PortalDataQueryField } from "./model";

export type PortalFacetBackedQueryField = Extract<
  PortalDataQueryField,
  | "facilityId"
  | "yard"
  | "inspectionTypeNumber"
  | "inspector"
  | "status"
  | "make"
  | "model"
  | "severity"
  | "damageArea"
  | "damageType"
>;

export type PortalFacetValueIssue = {
  code: "unsupported_facet_value";
  field: PortalFacetBackedQueryField;
  facet: keyof PortalFilterFacets;
  value: string;
  message: string;
};

export type PortalFacetValueValidationResult = {
  ok: boolean;
  issues: PortalFacetValueIssue[];
};

type FacetValueComparison = "exact" | "case-insensitive";

type FacetQueryFieldDefinition = {
  field: PortalFacetBackedQueryField;
  facet: keyof PortalFilterFacets;
  comparison: FacetValueComparison;
};

/**
 * Maps canonical query values to their authoritative facet collections.
 *
 * IDs and inspection numbers are exact backend identifiers. Text fields use
 * the same case-insensitive semantics as the facet response adapter, which
 * avoids rejecting a valid URL merely because a backend text value changed
 * case. Labels are never considered valid query values.
 */
export const PORTAL_FACET_QUERY_FIELD_DEFINITIONS = [
  { field: "facilityId", facet: "facilities", comparison: "exact" },
  { field: "yard", facet: "yards", comparison: "exact" },
  { field: "inspectionTypeNumber", facet: "inspectionTypes", comparison: "exact" },
  { field: "inspector", facet: "inspectors", comparison: "case-insensitive" },
  { field: "status", facet: "statuses", comparison: "case-insensitive" },
  { field: "make", facet: "makes", comparison: "case-insensitive" },
  { field: "model", facet: "models", comparison: "case-insensitive" },
  { field: "severity", facet: "severities", comparison: "case-insensitive" },
  { field: "damageArea", facet: "damageAreas", comparison: "case-insensitive" },
  { field: "damageType", facet: "damageTypes", comparison: "case-insensitive" },
] as const satisfies readonly FacetQueryFieldDefinition[];

function containsCanonicalValue(
  options: readonly PortalFilterOption[],
  value: string,
  comparison: FacetValueComparison,
): boolean {
  if (comparison === "exact") {
    return options.some((option) => option.value === value);
  }

  const semanticValue = value.toLocaleLowerCase();
  return options.some((option) => option.value.toLocaleLowerCase() === semanticValue);
}

/**
 * Validates only query fields backed by authoritative facets.
 *
 * Call this after the complete authorized facet response has loaded. The
 * function reports unsupported selections without mutating or dropping them,
 * allowing the UI to keep the selected value visible while showing a safe
 * validation state. Free-form, date, paging, and sorting fields are ignored.
 */
export function validatePortalQueryFacetValues(
  query: PortalDataQuery,
  facets: PortalFilterFacets,
): PortalFacetValueValidationResult {
  const issues: PortalFacetValueIssue[] = [];

  for (const definition of PORTAL_FACET_QUERY_FIELD_DEFINITIONS) {
    const value = query[definition.field];
    if (!value) continue;

    if (!containsCanonicalValue(facets[definition.facet], value, definition.comparison)) {
      issues.push({
        code: "unsupported_facet_value",
        field: definition.field,
        facet: definition.facet,
        value,
        message: `${definition.field} value is not available in the authorized ${definition.facet} options.`,
      });
    }
  }

  return { ok: issues.length === 0, issues };
}
