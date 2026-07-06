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
    freshness: { status: "local-demo", rendered_at: new Date().toISOString() },
  };
}

export function getWidgetRows(payload: RuntimeRenderPayload, widget: RuntimeWidgetDefinition): RuntimeDataRow[] {
  const datasetValue = payload.data?.[widget.datasetId];
  if (Array.isArray(datasetValue)) return datasetValue.filter(isRuntimeRow);
  if (isRecord(datasetValue) && Array.isArray(datasetValue.rows)) return datasetValue.rows.filter(isRuntimeRow);
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
