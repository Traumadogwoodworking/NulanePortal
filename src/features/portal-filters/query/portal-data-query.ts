import {
  PORTAL_DATA_QUERY_FIELDS,
  PORTAL_DATA_SORT_VALUES,
  PortalDataQueryValidationError,
  type PortalDataQuery,
  type PortalDataQueryField,
  type PortalDataQueryIssue,
  type PortalDataQueryValidationResult,
  type PortalDataSort,
} from "./model";

type UrlFieldDefinition = {
  field: PortalDataQueryField;
  parameter: string;
  aliases?: readonly string[];
};

const URL_FIELD_DEFINITIONS: readonly UrlFieldDefinition[] = [
  { field: "dateFrom", parameter: "from" },
  { field: "dateTo", parameter: "to" },
  {
    field: "facilityId",
    parameter: "facility",
    aliases: ["facility_id", "location_id"],
  },
  { field: "yard", parameter: "yard" },
  {
    field: "inspectionTypeNumber",
    parameter: "inspection_type",
    aliases: ["inspection_type_number"],
  },
  {
    field: "inspector",
    parameter: "inspector",
    aliases: ["inspector_email"],
  },
  { field: "status", parameter: "status" },
  { field: "make", parameter: "make" },
  { field: "model", parameter: "model" },
  { field: "severity", parameter: "severity" },
  { field: "damageArea", parameter: "damage_area" },
  { field: "damageType", parameter: "damage_type" },
  { field: "search", parameter: "q", aliases: ["search"] },
  { field: "page", parameter: "page" },
  { field: "pageSize", parameter: "page_size", aliases: ["pageSize"] },
  { field: "sort", parameter: "sort" },
  { field: "reportId", parameter: "report_id" },
  { field: "vin", parameter: "vin" },
  { field: "moduleKey", parameter: "module_key" },
] as const;

const STRING_FIELDS: readonly Exclude<
  PortalDataQueryField,
  "dateFrom" | "dateTo" | "page" | "pageSize" | "sort"
>[] = [
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
  "reportId",
  "vin",
  "moduleKey",
];

const SUPPORTED_FIELDS = new Set<string>(PORTAL_DATA_QUERY_FIELDS);
const SUPPORTED_SORTS = new Set<string>(PORTAL_DATA_SORT_VALUES);
const SUPPORTED_URL_PARAMETERS = new Set(
  URL_FIELD_DEFINITIONS.flatMap(({ parameter, aliases = [] }) => [parameter, ...aliases])
);

function issue(
  code: PortalDataQueryIssue["code"],
  message: string,
  details: Omit<PortalDataQueryIssue, "code" | "message"> = {}
): PortalDataQueryIssue {
  return { code, message, ...details };
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim();
  if (!normalized || normalized.toLowerCase() === "all") return undefined;
  return normalized;
}

/** Strict Gregorian calendar-date validation without timezone conversion. */
export function isPortalDateOnly(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= daysInMonth[month - 1];
}

function validateDateField(
  input: Record<string, unknown>,
  field: "dateFrom" | "dateTo",
  output: PortalDataQuery,
  issues: PortalDataQueryIssue[]
) {
  const value = input[field];
  if (value === undefined || value === null || value === "") return;
  if (typeof value !== "string") {
    issues.push(
      issue("invalid_type", `${field} must be a YYYY-MM-DD string.`, { field, value })
    );
    return;
  }
  const normalized = cleanString(value);
  if (!normalized) return;
  if (!isPortalDateOnly(normalized)) {
    issues.push(
      issue("invalid_date", `${field} must be a real date in YYYY-MM-DD form.`, {
        field,
        value,
      })
    );
    return;
  }
  output[field] = normalized;
}

function validatePagingField(
  input: Record<string, unknown>,
  field: "page" | "pageSize",
  output: PortalDataQuery,
  issues: PortalDataQueryIssue[]
) {
  const value = input[field];
  if (value === undefined || value === null || value === "") return;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    issues.push(
      issue("invalid_positive_integer", `${field} must be a positive safe integer.`, {
        field,
        value,
      })
    );
    return;
  }
  output[field] = value;
}

export function normalizePortalDataQuery(
  input: PortalDataQuery | Record<string, unknown>
): PortalDataQueryValidationResult {
  const source = input as Record<string, unknown>;
  const query: PortalDataQuery = {};
  const issues: PortalDataQueryIssue[] = [];

  for (const field of Object.keys(source)) {
    if (!SUPPORTED_FIELDS.has(field)) {
      issues.push(
        issue("unsupported_field", `Unsupported portal query field: ${field}.`, {
          value: source[field],
        })
      );
    }
  }

  validateDateField(source, "dateFrom", query, issues);
  validateDateField(source, "dateTo", query, issues);

  for (const field of STRING_FIELDS) {
    const value = source[field];
    if (value === undefined || value === null || value === "") continue;
    if (typeof value !== "string") {
      issues.push(
        issue("invalid_type", `${field} must be a string.`, { field, value })
      );
      continue;
    }
    const normalized = cleanString(value);
    if (normalized) query[field] = normalized;
  }

  validatePagingField(source, "page", query, issues);
  validatePagingField(source, "pageSize", query, issues);

  const sortValue = source.sort;
  if (sortValue !== undefined && sortValue !== null && sortValue !== "") {
    if (typeof sortValue !== "string") {
      issues.push(
        issue("invalid_type", "sort must be a string.", {
          field: "sort",
          value: sortValue,
        })
      );
    } else {
      const normalizedSort = cleanString(sortValue);
      if (normalizedSort && !SUPPORTED_SORTS.has(normalizedSort)) {
        issues.push(
          issue("unsupported_sort", `Unsupported report sort: ${normalizedSort}.`, {
            field: "sort",
            value: sortValue,
          })
        );
      } else if (normalizedSort) {
        query.sort = normalizedSort as PortalDataSort;
      }
    }
  }

  if (query.dateFrom && query.dateTo && query.dateFrom > query.dateTo) {
    issues.push(
      issue("invalid_date_range", "dateFrom cannot be after dateTo.", {
        field: "dateFrom",
        value: { dateFrom: query.dateFrom, dateTo: query.dateTo },
      })
    );
    delete query.dateFrom;
    delete query.dateTo;
  }

  return { ok: issues.length === 0, query, issues };
}

export function assertPortalDataQuery(
  input: PortalDataQuery | Record<string, unknown>
): PortalDataQuery {
  const result = normalizePortalDataQuery(input);
  if (!result.ok) throw new PortalDataQueryValidationError(result.issues);
  return result.query;
}

function parsePositiveIntegerParameter(
  field: "page" | "pageSize",
  parameter: string,
  value: string,
  issues: PortalDataQueryIssue[]
): number | undefined {
  const normalized = cleanString(value);
  if (!normalized) return undefined;
  if (!/^[1-9]\d*$/.test(normalized)) {
    issues.push(
      issue("invalid_positive_integer", `${parameter} must be a positive integer.`, {
        field,
        parameter,
        value,
      })
    );
    return undefined;
  }
  const parsed = Number(normalized);
  if (!Number.isSafeInteger(parsed)) {
    issues.push(
      issue("invalid_positive_integer", `${parameter} is outside the safe integer range.`, {
        field,
        parameter,
        value,
      })
    );
    return undefined;
  }
  return parsed;
}

function toUrlSearchParams(input: string | URLSearchParams): URLSearchParams {
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  const queryString = input.startsWith("?") ? input.slice(1) : input;
  return new URLSearchParams(queryString);
}

/**
 * Parses the durable URL state. Invalid or ambiguous values are rejected from
 * the returned query and described in issues so callers can render a safe,
 * visible validation state instead of guessing at a correction.
 */
export function parsePortalDataQuery(
  input: string | URLSearchParams
): PortalDataQueryValidationResult {
  const params = toUrlSearchParams(input);
  const rawQuery: Record<string, unknown> = {};
  const issues: PortalDataQueryIssue[] = [];

  for (const parameter of new Set(params.keys())) {
    if (!SUPPORTED_URL_PARAMETERS.has(parameter)) {
      issues.push(
        issue("unsupported_parameter", `Unsupported portal query parameter: ${parameter}.`, {
          parameter,
          value: params.getAll(parameter),
        })
      );
    }
  }

  for (const { field, parameter, aliases = [] } of URL_FIELD_DEFINITIONS) {
    const parameters = [parameter, ...aliases];
    const supplied = parameters.flatMap((candidate) =>
      params.getAll(candidate).map((value) => ({ parameter: candidate, value }))
    );
    if (supplied.length === 0) continue;
    if (supplied.length > 1) {
      issues.push(
        issue(
          "duplicate_parameter",
          `Multiple URL values were supplied for ${field}; use only ${parameter}.`,
          {
            field,
            parameter,
            value: supplied,
          }
        )
      );
      continue;
    }

    const suppliedValue = supplied[0];
    if (field === "page" || field === "pageSize") {
      const parsed = parsePositiveIntegerParameter(
        field,
        suppliedValue.parameter,
        suppliedValue.value,
        issues
      );
      if (parsed !== undefined) rawQuery[field] = parsed;
      continue;
    }
    rawQuery[field] = suppliedValue.value;
  }

  const normalized = normalizePortalDataQuery(rawQuery);
  const combinedIssues = [...issues, ...normalized.issues];
  return {
    ok: combinedIssues.length === 0,
    query: normalized.query,
    issues: combinedIssues,
  };
}

/** Stable URL order is the order declared in URL_FIELD_DEFINITIONS. */
export function serializePortalDataQuery(
  input: PortalDataQuery | Record<string, unknown>
): URLSearchParams {
  const query = assertPortalDataQuery(input);
  const params = new URLSearchParams();
  for (const { field, parameter } of URL_FIELD_DEFINITIONS) {
    const value = query[field];
    if (value !== undefined) params.set(parameter, String(value));
  }
  return params;
}

export function stringifyPortalDataQuery(
  input: PortalDataQuery | Record<string, unknown>
): string {
  return serializePortalDataQuery(input).toString();
}

export function resetPortalDataQuery(): PortalDataQuery {
  return {};
}
