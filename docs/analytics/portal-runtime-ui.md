# Portal Runtime UI

The portal runtime UI lives under `/analytics`.

Routes:

- `/analytics`: dashboard picker.
- `/analytics/home-inspection-overview`: native viewer for the reference `/home` dashboard package.
- `/analytics/builder`: paste/register/preview dashboard JSON.
- `/analytics/runs`: runtime preview/run history.

The UI does not replace `/home`. `/home` remains the current production-facing reference implementation. The runtime routes show how the same ideas become a reusable dashboard system.

## Data Flow

```text
Dashboard route
  -> runtime-client.ts
  -> /api/analytics runtime API or NEXT_PUBLIC_ANALYTICS_RUNTIME_BASE_URL
  -> render payload
  -> DashboardLayoutGrid
  -> DashboardWidgetRenderer
  -> metric/chart/table widgets
```

Widgets do not call the backend directly. They receive prepared rows from the render payload.

## Runtime API Base URL

Set this when using the Spring runtime locally:

```bash
NEXT_PUBLIC_ANALYTICS_RUNTIME_BASE_URL=http://localhost:8090/api/analytics npm run dev
```

If unset, the client falls back to `/api/analytics`, which is the same-origin Node bridge path.

## Static Fallback

The viewer includes a local reference dashboard fallback so the page still renders during static export or when the runtime API is offline.
