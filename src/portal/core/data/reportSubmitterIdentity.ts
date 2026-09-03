export type ReportSubmitterSource = {
  inspector_name?: unknown;
  inspectorName?: unknown;
  inspector_email?: unknown;
  inspectorEmail?: unknown;
};

export type ReportSubmitterIdentityValue = {
  name: string;
  email: string;
};

function readString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

/**
 * Reads only the backend's top-level, report-safe identity projection.
 * In shared workspaces inspector_email is already masked by the server; the
 * browser must never derive a masked value from a raw address in nested data.
 */
export function getReportSubmitterIdentity(
  source: ReportSubmitterSource | null | undefined
): ReportSubmitterIdentityValue {
  return {
    name: readString(source?.inspector_name, source?.inspectorName),
    email: readString(source?.inspector_email, source?.inspectorEmail),
  };
}
