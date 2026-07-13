export const PORTAL_DATA_QUERY_FIELDS = [
  "dateFrom",
  "dateTo",
  "facilityId",
  "yard",
  "inspectionTypeNumber",
  "inspector",
  "status",
  "make",
  "model",
  "severity",
  "damageArea",
  "damageType",
  "search",
  "page",
  "pageSize",
  "sort",
  "reportId",
  "vin",
  "moduleKey",
] as const;

export type PortalDataQueryField = (typeof PORTAL_DATA_QUERY_FIELDS)[number];

export const PORTAL_DATA_SORT_VALUES = [
  "created_at_desc",
  "updated_at_asc",
  "vin_asc",
] as const;

export type PortalDataSort = (typeof PORTAL_DATA_SORT_VALUES)[number];

/**
 * Canonical portal filter state.
 *
 * String properties hold backend values, never presentation labels. Dates are
 * calendar dates in YYYY-MM-DD form. The API treats dateFrom and dateTo as an
 * inclusive range of calendar days; no timezone conversion occurs here.
 */
export type PortalDataQuery = {
  dateFrom?: string;
  dateTo?: string;
  facilityId?: string;
  yard?: string;
  inspectionTypeNumber?: string;
  inspector?: string;
  status?: string;
  make?: string;
  model?: string;
  severity?: string;
  damageArea?: string;
  damageType?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sort?: PortalDataSort;
  reportId?: string;
  vin?: string;
  moduleKey?: string;
};

export type PortalDataQueryIssueCode =
  | "unsupported_field"
  | "unsupported_parameter"
  | "duplicate_parameter"
  | "invalid_type"
  | "invalid_date"
  | "invalid_date_range"
  | "invalid_positive_integer"
  | "unsupported_sort";

export type PortalDataQueryIssue = {
  code: PortalDataQueryIssueCode;
  message: string;
  field?: PortalDataQueryField;
  parameter?: string;
  value?: unknown;
};

export type PortalDataQueryValidationResult = {
  ok: boolean;
  query: PortalDataQuery;
  issues: PortalDataQueryIssue[];
};

export class PortalDataQueryValidationError extends Error {
  readonly issues: PortalDataQueryIssue[];

  constructor(issues: PortalDataQueryIssue[]) {
    super(issues.map((issue) => issue.message).join("; "));
    this.name = "PortalDataQueryValidationError";
    this.issues = issues;
  }
}
