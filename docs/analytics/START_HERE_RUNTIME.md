# Start Here: Analytics Runtime

Open these in order:

1. `/dashboard-examples`
2. `/analytics`
3. `/analytics/builder`
4. `src/features/home-analytics/README.md`
5. `src/features/dashboard-runtime/types.ts`
6. `src/features/dashboard-runtime/definition-schema.ts`

The core idea:

```text
A dashboard is not a pile of chart code.

A dashboard is a set of recipes:
1. filters
2. backend fields
3. adapter
4. visual declaration
5. component
6. export
7. empty/coverage state
```

`/home` is the current hand-built reference dashboard. `/analytics` is the beginning of the reusable runtime.

What works now:

- Native React viewer.
- Dashboard picker.
- JSON builder and validator.
- Static reference package fallback.
- Runtime client for Node or Spring API.
- Metric, chart, and table widget renderers.

What is scaffolded:

- Drag/drop layout.
- Scheduled runners.
- Materialized datasets.
- Production publishing workflow.
