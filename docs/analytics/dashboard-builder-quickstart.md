# Dashboard Builder Quickstart

## Add A Metric Card

1. Add a visual entry in `src/features/home-analytics/dashboard-config.ts`.
2. Add or reuse a selector in `analytics-adapters.ts`.
3. Render with `MetricCard` in `/home`.
4. Add export rows in `export-adapters.ts` if the metric belongs in a ZIP/CSV export.

## Add A Chart

1. Confirm the backend field contract.
2. Normalize the raw rows into a chart view model.
3. Render the chart from the view model only.
4. Add tooltip rows from the same normalized data.
5. Add a useful empty state for missing rows or missing fields.

## Add A Filter

1. Add the key to `HOME_ANALYTICS_FILTER_KEYS`.
2. Add parse/serialize handling in `filter-state.ts`.
3. Add query-param mapping in `buildDashboardAnalyticsParams`.
4. Wire one control in `/home`.
5. Confirm exports use the same filter object.

## Add An Export

1. Keep export data close to the visual view model.
2. Use `buildVisualExportRows` for simple row sets.
3. Include active filters and source endpoint in the export metadata.

## Add A Backend Field To The Frontend Contract

1. Document it in `docs/audits/current-home-analytics-and-publish.md`.
2. Add required field labels in `constants.ts` or the visual config.
3. Add adapter handling in `analytics-adapters.ts`.
4. Add dev mock values in `src/lib/devMockApi.ts` and the dev fallback script if needed.

## Add A Dev Mock Row

Update frontend mock payloads only:

- `src/lib/devMockApi.ts`
- `src/app/layout.tsx` only for the dev-session bypass mock script

Keep split fields explicit. Use zero values where one side is intentionally empty.

## Test, Build, Export

```bash
npx eslint src/app/home/page.tsx src/features/home-analytics src/app/layout.tsx src/lib/services/reportService.ts src/lib/devMockApi.ts src/lib/portalData.tsx src/components/reports/ReportsManager.tsx
node node_modules/typescript/bin/tsc --noEmit --pretty false
npm run build
npm run export:validate
```

## Mini Example

Add "Damage by Inspection Type":

1. Backend sends `byInspectionType` rows with `number`, `label`, `damageReports`, and `noDamageReports`.
2. Adapter normalizes rows into `{ key, label, damageCount, clearCount }`.
3. `dashboard-config.ts` gets a `damage-by-inspection-type` visual entry.
4. `/home` renders a bar chart from the normalized rows.
5. Export uses the same rows: `["Inspection Type", "Damaged", "Clear"]`.
