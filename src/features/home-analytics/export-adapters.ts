export type VisualExportRow = Record<string, string | number | null | undefined>;

export function buildVisualExportRows(rows: VisualExportRow[], columns: Array<[string, keyof VisualExportRow]>): unknown[][] {
  return [
    columns.map(([label]) => label),
    ...rows.map((row) => columns.map(([, key]) => row[key] ?? "")),
  ];
}

export function buildFilterExportRows(filters: Record<string, unknown>): unknown[][] {
  return [
    ["Filter", "Value"],
    ...Object.entries(filters).map(([key, value]) => [key, value ?? ""]),
  ];
}
