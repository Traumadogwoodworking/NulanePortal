import { REFERENCE_HOME_DASHBOARD } from "./definition-schema";
import type { RuntimeDashboardDefinition, RuntimeDataRow, RuntimeRenderPayload, RuntimeWidgetDefinition } from "./types";

export function buildLocalReferenceRender(slug = "home-inspection-overview"): RuntimeRenderPayload {
  const definition = slug === REFERENCE_HOME_DASHBOARD.slug ? REFERENCE_HOME_DASHBOARD : REFERENCE_HOME_DASHBOARD;
  return {
    dashboard: {
      slug: definition.slug,
      title: definition.title,
      description: definition.description,
      status: "local-demo",
      version: definition.version,
    },
    definition,
    filters: {},
    layout: definition.layout,
    widgets: definition.widgets,
    data: Object.fromEntries(definition.datasets.map((dataset) => [dataset.id, dataset.rows ?? dataset.data ?? []])),
    coverageWarnings: definition.coverageRequirements,
    freshness: { status: "local-demo" },
  };
}

export function getWidgetRows(payload: RuntimeRenderPayload, widget: RuntimeWidgetDefinition): RuntimeDataRow[] {
  const datasetValue = payload.data?.[widget.datasetId];
  if (Array.isArray(datasetValue)) return datasetValue.filter(isRuntimeRow).map((row) => flattenRuntimeRow(row));
  if (isRecord(datasetValue)) {
    if (Array.isArray(datasetValue.rows)) {
      return datasetValue.rows.filter(isRuntimeRow).map((row) => flattenRuntimeRow(row, "rows"));
    }

    for (const prefix of getWidgetFieldPrefixes(widget)) {
      const nestedValue = datasetValue[prefix];
      if (Array.isArray(nestedValue)) {
        return nestedValue.filter(isRuntimeRow).map((row) => flattenRuntimeRow(row, prefix));
      }
    }

    return [flattenRuntimeRow(datasetValue)];
  }
  return [];
}

export function getFirstNumericValue(rows: RuntimeDataRow[], keys: string[]): number {
  for (const row of rows) {
    for (const key of keys) {
      const value = row[key];
      if (typeof value === "number" && Number.isFinite(value)) return value;
    }
  }
  return 0;
}

export function getStringValue(row: RuntimeDataRow, keys: string[], fallback = "Unassigned"): string {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return fallback;
}

export function getNumberValue(row: RuntimeDataRow, key: string): number {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export type RuntimeDataSourceSummary = {
  id: string;
  status: string;
  rows: number;
  adapterPlan: boolean;
};

export function getRuntimeDataSourceSummaries(payload: RuntimeRenderPayload): RuntimeDataSourceSummary[] {
  return Object.entries(payload.data ?? {}).map(([id, value]) => {
    const rows = getDatasetRowCount(value);
    const status = getDatasetStatus(value);
    return {
      id,
      status,
      rows,
      adapterPlan: status === "adapter_plan",
    };
  });
}

export function getDefinitionSummary(definition: RuntimeDashboardDefinition): Array<{ label: string; value: string }> {
  return [
    { label: "Datasets", value: String(definition.datasets.length) },
    { label: "Widgets", value: String(definition.widgets.length) },
    { label: "Filters", value: String(definition.filters?.length ?? 0) },
    { label: "Layout Items", value: String(definition.layout.length) },
  ];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRuntimeRow(value: unknown): value is RuntimeDataRow {
  return isRecord(value);
}

function getWidgetFieldPrefixes(widget: RuntimeWidgetDefinition): string[] {
  const fields = [...widget.measures, ...widget.dimensions, ...(widget.requiredFields ?? [])];
  return Array.from(
    new Set(
      fields
        .map((field) => field.split(".")[0])
        .filter((prefix) => prefix && prefix !== "totals" && prefix !== "scope" && prefix !== "rows"),
    ),
  );
}

function flattenRuntimeRow(row: Record<string, unknown>, prefix?: string): RuntimeDataRow {
  const flattened = flattenRecord(row);
  if (!prefix) return flattened;

  const prefixed: RuntimeDataRow = { ...flattened };
  Object.entries(flattened).forEach(([key, value]) => {
    prefixed[`${prefix}.${key}`] = value;
  });

  addCommonLabelAliases(prefixed, prefix);
  return prefixed;
}

function flattenRecord(row: Record<string, unknown>, baseKey = ""): RuntimeDataRow {
  return Object.entries(row).reduce<RuntimeDataRow>((acc, [key, value]) => {
    const nextKey = baseKey ? `${baseKey}.${key}` : key;
    if (isRecord(value)) {
      Object.assign(acc, flattenRecord(value, nextKey));
    } else {
      acc[nextKey] = value;
    }
    return acc;
  }, {});
}

function addCommonLabelAliases(row: RuntimeDataRow, prefix: string): void {
  const label = row[`${prefix}.label`] ?? row[`${prefix}.name`] ?? row.label ?? row.name;
  if (label === undefined) return;
  if (row[`${prefix}.damage_area`] === undefined) row[`${prefix}.damage_area`] = label;
  if (row[`${prefix}.damage_type`] === undefined) row[`${prefix}.damage_type`] = label;
  if (row[`${prefix}.severity`] === undefined) row[`${prefix}.severity`] = label;
  if (row[`${prefix}.facility`] === undefined) row[`${prefix}.facility`] = label;
  if (row[`${prefix}.inspector_email`] === undefined) row[`${prefix}.inspector_email`] = label;
}

function getDatasetStatus(value: unknown): string {
  if (isRecord(value)) {
    const status = value.status;
    if (typeof status === "string" && status.trim()) return status;
    return "executed";
  }
  if (Array.isArray(value)) return "executed";
  return "missing";
}

function getDatasetRowCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (!isRecord(value)) return 0;
  if (Array.isArray(value.rows)) return value.rows.length;
  return Object.values(value).reduce<number>((total, nested) => total + (Array.isArray(nested) ? nested.length : 0), 0);
}
