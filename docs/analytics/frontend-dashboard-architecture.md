# Frontend Dashboard Architecture

## Target Structure

```text
src/features/home-analytics/
  types.ts
  constants.ts
  analytics-adapters.ts
  filter-state.ts
  dashboard-config.ts
  export-adapters.ts
  components/
```

`/home` remains the route orchestrator. The feature folder owns reusable dashboard logic that another page can copy without inheriting every detail of `page.tsx`.

## Design Rules

- API response shape is not used directly by every visual.
- Normalize once through adapters.
- Filters are one shared object.
- URL params are normalized in one place.
- Visuals use config where practical.
- Charts get prepared view-model data, not raw API rows.
- Exports share the same prepared data where possible.
- Coverage warnings come from field requirements, not random runtime checks.
- Backend contract remains documented; frontend does not implement backend analytics.

## Current Known Backend Contract

Documented only. No backend code is implemented here.

- `totals.damageReports`
- `totals.noDamageReports` or `totals.clearReports`
- `byFacilityDaily` rows with `date`, `label`, `damageReports`, `noDamageReports`
- `byInspectorDaily` rows with `date`, `label` or `email`, `damageReports`, `noDamageReports`
- `byFacility` aggregate rows
- `byInspector` aggregate rows
- `severity`
- `topAreas`
- `topTypes`
- `byInspectionType`

## Current Frontend Modules

- `types.ts`: shared dashboard filter, split, coverage, metric, and visual types.
- `constants.ts`: filter keys, endpoint names, split-field aliases, and required backend field descriptions.
- `analytics-adapters.ts`: pure readers, split counters, coverage status, and breakdown row builders.
- `filter-state.ts`: parse, serialize, and convert URL-driven filters into backend query params.
- `dashboard-config.ts`: visual ids, titles, descriptions, and required backend fields.
- `export-adapters.ts`: small helpers that map visual model rows to export rows.
- `components/`: small presentational components used by `/home`.

## Future Domains

These should stay future-only until backend adapters exist:

- yard/outfitter exceptions
- missing ready scan
- POD-before-delivery
- stuck units
- vehicle timeline
