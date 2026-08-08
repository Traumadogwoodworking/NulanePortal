# Dashboard Recipes

These examples show how to add to the `/home` dashboard framework without rewriting the page.

## Builder Checklist

To add a dashboard visual:

1. Write the business question.
2. List backend fields.
3. Add visual config.
4. Add adapter.
5. Render component.
6. Add export.
7. Add empty state.
8. Run build.

Use the same checklist on `/dashboard-examples` when walking someone through the framework.

## Recipe 1: Add A Metric

Example: `Clear Rate`

Business question: What percentage of inspected submissions were clear?

Backend fields:

- `totals.damageReports`
- `totals.noDamageReports`

Visual declaration:

```ts
{
  id: "summary-clear-rate",
  title: "Clear Rate",
  endpoint: "/dashboard/analytics",
  requiredFields: ["totals.damageReports", "totals.noDamageReports"],
  dataSource: "dashboard-analytics",
  measures: ["damageReports", "noDamageReports", "clearRate"],
  dimensions: ["organization", "date range"],
  slicers: ["from", "to", "facility", "inspector", "status", "inspection type"],
  adapter: "selectClearRateMetric",
  component: "MetricCard",
  exportFile: "sections/card-data.csv",
  emptyState: "Show coverage warning when the clear/damaged split is missing."
}
```

Selector:

```ts
const totalKnown = damageReports + noDamageReports;
const clearRate = totalKnown > 0 ? noDamageReports / totalKnown : null;
```

Rule: return `null` and show coverage if either split field is missing.

## Recipe 2: Add A Chart

Example: `Damage By Inspection Type`

Business question: Which inspection types are creating the most damaged submissions?

Backend contract:

```ts
{
  byInspectionType: [
    {
      number: "02",
      label: "Type 02",
      damageReports: 34,
      noDamageReports: 91
    }
  ]
}
```

Steps:

1. Add a visual id in `types.ts`.
2. Add one `HOME_DASHBOARD_VISUALS` entry in `dashboard-config.ts`.
3. Add an adapter that returns `{ key, label, damageCount, clearCount, totalCount }`.
4. Render the prepared rows in a chart component.
5. Export the same prepared rows.

Do not let the chart parse raw backend rows directly.

## Recipe 3: Add A Filter

Example: `Carrier`

Add one field to the filter model:

```ts
export type HomeAnalyticsFilters = {
  carrier?: string;
};
```

Then update one place for each direction:

- parse URL key in `parseHomeAnalyticsFilters()`
- serialize URL key in `serializeHomeAnalyticsFilters()`
- add backend request key in `buildDashboardAnalyticsParams()`
- add chip text in `getActiveHomeFilterChips()`

Every visual and export should use `currentHomeAnalyticsFilters`. Avoid reading query params directly in a chart.

## Recipe 4: Add An Export

Example: `damage-by-inspection-type.csv`

Use the same view-model rows the chart uses:

```ts
export function buildInspectionTypeExportRows(rows: InspectionTypeViewRow[]) {
  return rows.map((row) => ({
    inspection_type: row.label,
    damaged_submissions: row.damageCount,
    clear_submissions: row.clearCount,
    total_known_split: row.totalCount,
  }));
}
```

Then connect the visual declaration:

```ts
exportFile: "damage-by-inspection-type.csv"
```

This keeps the chart and CSV honest with each other.

## Recipe 5: Add A Backend Field

Example: `byInspectionType`

Document the contract first:

```ts
byInspectionType: Array<{
  number: string;
  label: string;
  damageReports: number;
  noDamageReports: number;
}>
```

Then wire the frontend:

- add `requiredFields` to the visual declaration
- add an adapter that checks explicit damaged and clear fields
- add a coverage warning if the fields are missing
- add mock rows in `src/lib/devMockApi.ts` only when useful for local demo

The frontend should never fill a missing damaged split by using a generic total.
