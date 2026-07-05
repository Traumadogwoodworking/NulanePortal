# Home Dashboard Explainer For Power BI And JavaScript Users

## What This Page Is

`/home` is a Next.js analytics dashboard page. It is not Power BI, but it uses the same reporting model:

- data source
- measures
- dimensions
- slicers
- visuals
- tooltips
- exports
- backend contract

The page is designed for operational logistics users who need to see damage submissions, clear/no-damage submissions, inspectors, facilities, and damage patterns without opening a giant report table.

## How The Parts Talk To Each Other

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

In Power BI terms, `currentHomeAnalyticsFilters` is the active slicer state, `analytics-adapters.ts` is the transform/model layer, `dashboard-config.ts` is the visual catalog, and `page.tsx` is the report canvas.

## Power BI Concept Mapping

| Power BI idea | Frontend equivalent |
|---|---|
| Dataset/table | API payload from `GET /dashboard/analytics` or lightweight report preview |
| Measure | TypeScript selector/adapter value such as `damageReports`, `noDamageReports`, `totalReports` |
| Dimension | Date, facility, inspector, severity, damage area/type, inspection type |
| Slicer | URL-driven filter state: date range, facility, inspector, status/type/search |
| Visual | Metric card, trend chart, severity chart, tooltip, export |
| DAX measure | Pure TypeScript adapter function |
| Power Query transform | Normalizer/adapter layer |
| Data model relationship | Shared keys: facility id/label, inspector email/id, date, report id, VIN |
| Report page | Next.js route/page |
| Tooltip page | Reusable tooltip component |
| Export data | CSV/ZIP builder |

## Current Data Sources

- `GET /dashboard/analytics`: primary aggregate source for totals, trends, split fields, severity, top areas, top types, facilities, and inspectors.
- `GET /reports/list`: lightweight report preview source for exports, VIN samples, and local fallback details.
- `src/lib/devMockApi.ts`: local mock API data for development and forced dev-session bypass.
- `src/app/layout.tsx`: static fallback mock script used only for the dev-session bypass path.

## Current Measures

- total inspections
- damage reports
- clear/no-damage reports
- damage entries
- RSA reports
- active facilities
- unique inspectors
- severity counts
- top damage areas/types

## Current Dimensions

- date/day
- facility
- inspector
- report status/type
- severity
- damage area
- damage type
- VIN/report id where preview rows are used

## Current Slicers And Filters

- date range
- facility
- inspector
- report status/type
- search/query style report fields: report id, VIN, make, model, yard
- count mode is currently fixed to `reports` on `/home`

Filters are serialized into URL query parameters so a filtered dashboard view can be shared or reloaded.

## Filter Reference

| Slicer/filter | URL key | Backend request key | Notes |
|---|---|---|---|
| From date | `from` | `from` | Start of the dashboard date window. |
| To date | `to` | `to` | End of the dashboard date window. |
| Facility | `facility` | `facility_id` when the value is a backend id | Facility labels can still be used for client display and export filtering. |
| Inspector | `inspector` | `inspector_email` | Stored as `inspectorKey` in `currentHomeAnalyticsFilters`. |
| Status | `status` | `status` | Report status filter. |
| Report id | `report_id` | `report_id` | Mostly useful for preview/export rows. |
| VIN | `vin` | `vin` | Normalized to uppercase. |
| Inspection type | `inspection_type` | `inspection_type` | Number/string from backend inspection type rows. |
| Make | `make` | `make` | Preview/export filter. |
| Model | `model` | `model` | Preview/export filter. |
| Yard | `yard` | `yard` | Available as a row filter only; the yard pie visual is intentionally not active. |
| Severity | `severity` | `severity` | Used by severity chart and report preview filtering. |
| Damage area | `damage_area` | `damage_area` | Used by area chart and report preview filtering. |

The page should not build request params in multiple places. New visuals should use `currentHomeAnalyticsFilters` and `buildDashboardAnalyticsParams(currentHomeAnalyticsFilters)`.

## Current Visuals

| Visual | Location | Source fields | Filters applied | Fallback behavior | Export behavior | Field meaning |
|---|---|---|---|---|---|---|
| Total Damage Submissions | `src/app/home/page.tsx` metric config and `MetricCard` | `totals.damageReports`, `totals.noDamageReports`, report preview outcome counts | shared home filters | preview counts only when backend totals are absent | included in all-section ZIP metadata | total damage workflow submissions, not RSA |
| Damaged Submissions Today | `/home` metric grid | `damageReportsToday`, `currentPeriod.damageToday` | date/status/facility/inspector filters | shows zero if explicit fields are missing | included in metric export rows | daily damaged submissions |
| Damage vs Clear | `DamageClearMetricValue` | `damageReports`, `noDamageReports` or explicit aliases | shared home filters | clear side comes from preview only when totals lack explicit clear fields | included in metric export rows | side-by-side damaged and clear submissions |
| RSA Reports | `/home` metric grid | `rsaReports`, `rsaReportsToday` | dashboard analytics filters where backend honors them | stays separate from damage measures | included as separate metric | rail/RSA reports, not damage submissions |
| Facility Daily Trend | trend chart block | `byFacilityDaily.date`, `label`, `damageReports`, `noDamageReports` | facility/date/report filters | shows coverage warning if split fields are missing | chart CSV in all-section ZIP | per-day facility damaged vs clear mix |
| Inspector Daily Trend | trend chart block | `byInspectorDaily.date`, `email/label`, `damageReports`, `noDamageReports` | inspector/date/report filters | shows coverage warning if split fields are missing | chart CSV in all-section ZIP | per-day inspector damaged vs clear mix |
| Severity Chart | severity pie/bar section | `severity.level`, `label`, `count` | severity and shared filters | empty state when backend returns no severity rows | severity CSV | where damage seriousness concentrates |
| Top Damage Areas/Types | top bucket cards/charts | `topAreas`, `topTypes` | shared home filters | empty state when rows are missing | top bucket CSV | recurring damage locations and damage modes |

## Visual Registry

The visual catalog lives in `src/features/home-analytics/dashboard-config.ts`.

Each entry declares:

- `dataSource`: where the visual data comes from
- `measures`: numeric values the visual consumes
- `dimensions`: grouping fields like date, facility, inspector, severity
- `slicers`: filters that should affect the visual
- `requiredFields`: backend fields required for honest rendering
- `adapter`: the selector/normalizer that prepares the view model
- `component`: the React/Recharts presentation piece
- `exportFile`: the CSV/ZIP file this visual maps to
- `emptyState`: what the user should see when fields are missing

Sections are grouped in `HOME_DASHBOARD_SECTIONS`:

- Scoreboard
- Daily Trends
- Damage Profile

This gives the dashboard a lightweight Power BI-style model without installing a BI product.

## Examples Package

The dashboard examples package is meant for handoff and demos:

| File or route | Purpose |
|---|---|
| `docs/analytics/dashboard-language.md` | Defines the dashboard vocabulary: measure, dimension, slicer, adapter, visual declaration, coverage warning. |
| `docs/analytics/dashboard-recipes.md` | Shows copyable examples for adding a metric, chart, filter, export, and backend field. |
| `src/features/home-analytics/dashboard-examples.ts` | Keeps the examples in typed JavaScript data so docs and UI can stay aligned. |
| `/dashboard-examples` | Renders mock visuals and declarations without changing `/home` behavior. |

Use `/dashboard-examples` when explaining how the pieces talk to each other. Use `/home` when validating the real dashboard.

## File Map

| File | Role | What to show a JavaScript developer |
|---|---|---|
| `src/app/home/page.tsx` | Route/canvas | The page wires filters, hooks, selectors, visuals, and exports together. |
| `src/features/home-analytics/filter-state.ts` | Slicer state | URL params become one `HomeAnalyticsFilters` object. |
| `src/features/home-analytics/analytics-adapters.ts` | Transform/model layer | Raw backend rows become safe numbers, split pairs, coverage issues, and tooltip data. |
| `src/features/home-analytics/dashboard-config.ts` | Visual registry | Each visual declares source, fields, measures, dimensions, slicers, adapter, component, export, and empty state. |
| `src/features/home-analytics/export-adapters.ts` | Export layer | Visual/filter state becomes CSV/ZIP rows. |
| `src/features/home-analytics/components/` | Presentation | Small reusable cards/alerts used by the page. |
| `src/lib/portalData.tsx` | Data hooks/cache | Fetches and caches dashboard analytics/report preview snapshots. |
| `src/lib/services/reportService.ts` | API client types | Frontend service contract for analytics and report list endpoints. |
| `src/lib/devMockApi.ts` | Frontend dev data | Local mock payloads for demonstrating clear/damaged values. |

## Clear Vs Damaged Rule

Damaged must come from explicit backend damaged fields.

Clear/no-damage must come from explicit backend clear/no-damage fields.

Do not fake damaged with `totalReports - rsaReports`.

Do not classify RSA reports as damage submissions.

If backend split fields are missing, `/home` shows a coverage warning instead of fake numbers.

## How A Power BI Person Adds A Visual

Example: add "Damage by Inspection Type."

1. Backend field needed: `byInspectionType: Array<{ number: string; label: string; damageReports: number; noDamageReports: number }>`
2. Type needed: add a visual id such as `"damage-by-inspection-type"` to `HomeDashboardVisualId`.
3. Adapter needed: add a pure selector in `src/features/home-analytics/analytics-adapters.ts` that normalizes each row into `{ key, label, damageCount, clearCount, totalCount }`.
4. Visual config entry: add a full `HOME_DASHBOARD_VISUALS` entry:

```ts
{
  id: "damage-by-inspection-type",
  title: "Damage By Inspection Type",
  description: "Shows damaged and clear submissions by inspection type.",
  endpoint: DASHBOARD_ANALYTICS_ENDPOINT,
  requiredFields: ["byInspectionType.number", "byInspectionType.damageReports", "byInspectionType.noDamageReports"],
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

5. Chart usage: render the prepared view-model rows in `/home`; do not let the chart parse raw API rows.
6. Export rows: add a small export adapter in `src/features/home-analytics/export-adapters.ts` so the visual and export use the same prepared data.

That keeps the dashboard close to a Power BI model: define the fields, normalize once, render the visual, export the same rows.
