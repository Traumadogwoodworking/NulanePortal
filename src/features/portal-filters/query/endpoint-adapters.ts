import { assertPortalDataQuery } from "./portal-data-query";
import type { PortalDataQuery } from "./model";

export type PortalEndpointParams = Record<string, string | number>;

function set(
  params: PortalEndpointParams,
  key: string,
  value: string | number | undefined
) {
  if (value !== undefined) params[key] = value;
}

/**
 * /reports/list uses location_id for the canonical facility/location ID. This
 * is deliberately different from the analytics endpoint's facility_id key.
 */
export function adaptPortalQueryForReportList(
  input: PortalDataQuery | Record<string, unknown>
): PortalEndpointParams {
  const query = assertPortalDataQuery(input);
  const params: PortalEndpointParams = {};
  set(params, "from", query.dateFrom);
  set(params, "to", query.dateTo);
  set(params, "location_id", query.facilityId);
  set(params, "yard", query.yard);
  set(params, "inspection_type", query.inspectionTypeNumber);
  set(params, "inspector_email", query.inspector);
  set(params, "status", query.status);
  set(params, "make", query.make);
  set(params, "model", query.model);
  set(params, "severity", query.severity);
  set(params, "damage_area", query.damageArea);
  set(params, "damage_type", query.damageType);
  set(params, "search", query.search);
  set(params, "page", query.page);
  set(params, "page_size", query.pageSize);
  set(params, "sort", query.sort);
  set(params, "report_id", query.reportId);
  set(params, "vin", query.vin);
  set(params, "module_key", query.moduleKey);
  return params;
}

/** Dashboard analytics has an established facility_id request contract. */
export function adaptPortalQueryForDashboardAnalytics(
  input: PortalDataQuery | Record<string, unknown>
): PortalEndpointParams {
  const query = assertPortalDataQuery(input);
  const params: PortalEndpointParams = {};
  set(params, "from", query.dateFrom);
  set(params, "to", query.dateTo);
  set(params, "facility_id", query.facilityId);
  set(params, "yard", query.yard);
  set(params, "inspection_type", query.inspectionTypeNumber);
  set(params, "inspector_email", query.inspector);
  set(params, "status", query.status);
  set(params, "make", query.make);
  set(params, "model", query.model);
  set(params, "severity", query.severity);
  set(params, "damage_area", query.damageArea);
  set(params, "damage_type", query.damageType);
  set(params, "search", query.search);
  set(params, "report_id", query.reportId);
  set(params, "vin", query.vin);
  set(params, "module_key", query.moduleKey);
  return params;
}

/** Snapshot accepts only its declared filter dimensions, never list controls. */
export function adaptPortalQueryForHomeSnapshot(
  input: PortalDataQuery | Record<string, unknown>
): PortalEndpointParams {
  const query = assertPortalDataQuery(input);
  const params: PortalEndpointParams = {};
  set(params, "from", query.dateFrom);
  set(params, "to", query.dateTo);
  set(params, "facility_id", query.facilityId);
  set(params, "yard", query.yard);
  set(params, "severity", query.severity);
  set(params, "damage_area", query.damageArea);
  set(params, "damage_type", query.damageType);
  set(params, "inspection_type", query.inspectionTypeNumber);
  set(params, "module_key", query.moduleKey);
  set(params, "status", query.status);
  set(params, "inspector_email", query.inspector);
  return params;
}

export type PortalFilterFacetEndpointParams = Record<string, never>;

/**
 * Facets represent the complete authorized organization dataset, so active
 * filters, dates, search, paging, and sort are intentionally not forwarded.
 */
export function adaptPortalQueryForFilterFacets(): PortalFilterFacetEndpointParams {
  return {};
}
