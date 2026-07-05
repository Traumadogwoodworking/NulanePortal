# Home Analytics Framework

This folder is the maintainable dashboard layer for `/home`. It is meant to make the page easy to explain to a JavaScript-literate business partner: filters are normalized once, backend fields are declared once, visuals are described in config, and the route renders the configured dashboard pieces.

## Flow

```text
URL query params
  -> parseHomeAnalyticsFilters()
  -> currentHomeAnalyticsFilters
  -> buildDashboardAnalyticsParams()
  -> GET /dashboard/analytics and GET /reports/list
  -> analytics-adapters.ts normalize backend data
  -> dashboard-config.ts declares visuals
  -> page.tsx renders visuals
  -> export-adapters.ts builds export rows
```

## File Map

| File | Job | Talks to |
|---|---|---|
| `types.ts` | Shared TypeScript names for filters, visuals, coverage, and metrics. | Every other file imports stable shapes from here. |
| `constants.ts` | Endpoint names, filter keys, split-field aliases, and backend field requirement labels. | Adapters and visual config use these constants instead of repeating strings. |
| `filter-state.ts` | Turns URL params into `HomeAnalyticsFilters`, turns filters into URL params, and turns filters into backend query params. | `src/app/home/page.tsx` uses this for URL state and API request params. |
| `analytics-adapters.ts` | Reads numbers/strings safely, reads explicit damaged/clear splits, builds coverage issues, and builds tooltip breakdown rows. | Page selectors and warning components use these pure helpers. |
| `dashboard-config.ts` | Declares each visual: source, measures, dimensions, slicers, adapter, component, export file, and empty state. | The route and docs use this as the dashboard registry. |
| `export-adapters.ts` | Builds consistent CSV/export rows from visual/filter state. | ZIP/export code in `/home` uses these helpers. |
| `components/` | Small presentation pieces: metric card, damage-vs-clear metric, coverage alert. | `src/app/home/page.tsx` renders these components. |
| `src/app/home/page.tsx` | Orchestrates the page: owns local UI state, calls hooks, selects data, renders charts. | Uses this feature folder; should not duplicate its constants or rules. |

## Visual Declaration Model

Every visual should have one entry in `HOME_DASHBOARD_VISUALS`.

```ts
{
  id: "facility-daily-trend",
  title: "Facility Daily Trend",
  description: "Per-day facility clear and damaged breakdown.",
  endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
  requiredFields: ["date", "label", "damageReports", "noDamageReports"],
  dataSource: "dashboard-analytics",
  measures: ["damageReports", "noDamageReports"],
  dimensions: ["date", "facility label", "facility id"],
  slicers: ["from", "to", "facility", "status", "inspection type"],
  adapter: "buildDailyAnalyticsTrend and buildDashboardDailySplitCoverage",
  component: "Recharts BarChart with DashboardTrendTooltip",
  exportFile: "daily-damage-submission-analytics.csv",
  emptyState: "Show coverage warning if daily rows do not include explicit split fields."
}
```

This is the BI-style contract for the visual. The rendered JSX can still live in `page.tsx`, but the visual definition should be readable without opening the page.

## Filter Reference

| Filter | URL key | Backend key | Type | Used by |
|---|---|---|---|---|
| From date | `from` | `from` | ISO date string | Analytics and report preview |
| To date | `to` | `to` | ISO date string | Analytics and report preview |
| Facility | `facility` | `facility_id` when the value is an id | string id or label key | Analytics, report preview, charts |
| Inspector | `inspector` | `inspector_email` | email string | Analytics, report preview, inspector visuals |
| Status | `status` | `status` | report status string | Analytics and report preview |
| Report id | `report_id` | `report_id` | string | Report preview and exports |
| VIN | `vin` | `vin` | uppercase string | Report preview and exports |
| Inspection type | `inspection_type` | `inspection_type` | inspection number/string | Analytics and report preview |
| Make | `make` | `make` | string | Report preview and exports |
| Model | `model` | `model` | string | Report preview and exports |
| Yard | `yard` | `yard` | string | Report preview and exports only; no yard pie visual is active |
| Severity | `severity` | `severity` | severity level string | Severity chart and report preview |
| Damage area | `damage_area` | `damage_area` | area label/string | Area chart and report preview |

`currentHomeAnalyticsFilters` is the one normalized object on the page. Use it for new visuals and exports instead of reading URL params or state variables in multiple places.

## Data Integrity Rules

- Damaged counts must come from explicit damaged fields such as `damageReports`.
- Clear counts must come from explicit clear/no-damage fields such as `noDamageReports` or `clearReports`.
- Do not infer damaged by subtracting RSA counts from total report counts.
- Do not treat `totalReports`, `reports`, or `count` as damaged submissions.
- RSA reports stay separate from damage submissions.
- Missing split fields should produce a coverage warning, not fake numbers.

## How To Add A Visual

Example: add "Damage by Inspection Type."

1. Backend contract: ask for `byInspectionType` rows with `number`, `label`, `damageReports`, and `noDamageReports`.
2. Type/config: add a new visual id in `types.ts` and a full entry in `dashboard-config.ts`.
3. Adapter: add a pure helper in `analytics-adapters.ts` that maps raw rows into chart rows.
4. Render: import the visual config in `page.tsx`, call the adapter in a `useMemo`, and render an existing chart/card component.
5. Tooltip: use the prepared view model, not raw backend rows.
6. Export: add rows with `export-adapters.ts` or the page's existing ZIP section builder.
7. Empty state: use the config's `emptyState` and coverage warnings when required fields are missing.

The important pattern is: declare the visual, normalize the data once, render from normalized rows, and export the same normalized rows.
