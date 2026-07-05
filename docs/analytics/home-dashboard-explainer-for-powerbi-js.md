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

## Clear Vs Damaged Rule

Damaged must come from explicit backend damaged fields.

Clear/no-damage must come from explicit backend clear/no-damage fields.

Do not fake damaged with `totalReports - rsaReports`.

Do not classify RSA reports as damage submissions.

If backend split fields are missing, `/home` shows a coverage warning instead of fake numbers.

## How A Power BI Person Adds A Visual

Example: add "Damage by Inspection Type."

1. Backend field needed: `byInspectionType: Array<{ number: string; label: string; count: number; damageReports?: number; noDamageReports?: number }>`
2. Adapter needed: add a pure selector in `src/features/home-analytics/analytics-adapters.ts` that normalizes each row into `{ key, label, damageCount, clearCount, totalCount }`.
3. Visual config entry: add a `visualId`, title, endpoint, and required fields in `src/features/home-analytics/dashboard-config.ts`.
4. Chart usage: render the prepared view-model rows in `/home`; do not let the chart parse raw API rows.
5. Export rows: add a small export adapter in `src/features/home-analytics/export-adapters.ts` so the visual and export use the same prepared data.

That keeps the dashboard close to a Power BI model: define the fields, normalize once, render the visual, export the same rows.
