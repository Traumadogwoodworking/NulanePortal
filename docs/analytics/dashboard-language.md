# Dashboard Language

This portal dashboard framework uses a small language that feels familiar to a Power BI user but stays simple for a JavaScript developer.

The goal is not to build a full BI tool. The goal is to make every dashboard visual easy to explain:

- what question it answers
- which backend fields it needs
- which filters affect it
- which adapter prepares the data
- which component renders it
- which export file contains its rows

## The Flow

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

## Vocabulary

| Word | Business meaning | JavaScript meaning | `/home` example |
|---|---|---|---|
| Measure | A number the business wants to compare. | A named numeric value such as `damageReports` or `noDamageReports`. | Damage Reports and Clear Reports. |
| Dimension | The way the number is grouped. | A row key or label such as date, facility, inspector, severity, or inspection type. | Facility Daily Trend groups by day and facility. |
| Slicer | A filter the viewer applies. | A field in `HomeAnalyticsFilters`, serialized into URL and API params. | `facility`, `inspector`, `from`, `to`, `status`, `vin`. |
| Adapter | The data clean-up step. | A pure TypeScript function that turns API rows into chart rows. | `buildDailyAnalyticsTrend`. |
| Visual declaration | The contract for a chart/card. | One `HOME_DASHBOARD_VISUALS` object in `dashboard-config.ts`. | `facility-daily-trend`. |
| Coverage warning | A clear notice that data is missing. | An `AnalyticsCoverageIssue` built from required fields and adapter checks. | Clear vs damaged split warnings. |

## Visual Declaration Shape

```ts
{
  id: "damage-by-inspection-type",
  title: "Damage By Inspection Type",
  description: "Damaged and clear submissions grouped by inspection type.",
  endpoint: "/dashboard/analytics",
  requiredFields: [
    "byInspectionType.number",
    "byInspectionType.damageReports",
    "byInspectionType.noDamageReports"
  ],
  dataSource: "dashboard-analytics",
  measures: ["damageReports", "noDamageReports"],
  dimensions: ["inspection type number", "inspection type label"],
  slicers: ["from", "to", "facility", "inspector", "status"],
  adapter: "buildDamageByInspectionTypeRows",
  component: "Recharts BarChart",
  exportFile: "damage-by-inspection-type.csv",
  emptyState: "Show coverage warning when split fields are missing."
}
```

Read it like this:

- `measures` are the numbers.
- `dimensions` are the group-by fields.
- `slicers` are the filters that must affect the visual.
- `requiredFields` are the backend contract.
- `adapter` is where raw payload becomes chart-ready rows.
- `component` is the renderer.
- `exportFile` is the downloadable output.
- `emptyState` is what the user sees when the data is missing.

## Builder Checklist

Every new dashboard visual should follow the same recipe:

1. Write the business question.
2. List backend fields.
3. Add visual config.
4. Add adapter.
5. Render component.
6. Add export.
7. Add empty state.
8. Run build.

That keeps the dashboard from becoming a pile of one-off chart code.

## Integrity Rule

Damaged counts must come from explicit damaged fields.

Clear/no-damage counts must come from explicit clear/no-damage fields.

The frontend must not calculate damaged submissions from `totalReports - rsaReports`, and it must not treat generic `totalReports`, `reports`, or `count` as damaged submissions unless the backend explicitly labels them as damaged.

## Where To Demo This

- Code framework: `src/features/home-analytics/`
- Visual registry: `src/features/home-analytics/dashboard-config.ts`
- Examples registry: `src/features/home-analytics/dashboard-examples.ts`
- Example page: `/dashboard-examples`
- Power BI mapping: `docs/analytics/home-dashboard-explainer-for-powerbi-js.md`
- Recipes: `docs/analytics/dashboard-recipes.md`
