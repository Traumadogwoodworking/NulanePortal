# Dashboard Runtime Architecture

This is the first planning document for turning the current `/home` analytics work into a reusable dashboard runtime across the portal frontend and the Inspection Trac backend.

The rule for this phase is conservative: reuse the existing `/home` dashboard pattern, existing backend report/dashboard endpoints, and existing auth/org/facility scope logic. Do not deploy, do not touch production, do not add arbitrary SQL upload, do not fake damaged counts, and do not bring back the yard pie UI.

## Repos Inspected

| Area | Path | Current state |
| --- | --- | --- |
| Portal frontend | `/Users/home/Desktop/Codex/websites/vercel-portal-exact` | Git branch `feature/frontend-home-analytics-framework`; `/home`, `src/features/home-analytics`, and `/dashboard-examples` already exist. |
| Rescue backend | `/Users/home/Desktop/NulaneRepo-rescue-prod-live-inspection-trac-20260705-022200` | Plain backend folder with `server.js`, `src/routes`, `src/services`, `src/lib`, `src/db`, and numbered SQL migrations. The folder root is not currently a git checkout. |

## Current Frontend Flow

The current `/home` implementation is already the first dashboard reference pattern:

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

Files to reuse:

| File | Runtime lesson to keep |
| --- | --- |
| `src/app/home/page.tsx` | Route-level orchestration, shared filter object, endpoint calls, render wiring, and export actions. |
| `src/app/dashboard-examples/page.tsx` | Business-partner demo of dashboard recipes and visual declarations. |
| `src/features/home-analytics/filter-state.ts` | URL-backed slicer/filter normalization and backend query-param mapping. |
| `src/features/home-analytics/dashboard-config.ts` | Current visual registry pattern: data source, measures, dimensions, slicers, adapter, component, export file, empty state. |
| `src/features/home-analytics/analytics-adapters.ts` | Safe frontend normalization layer for backend analytics payloads. |
| `src/features/home-analytics/export-adapters.ts` | Export rows built from the same prepared state used by visuals. |
| `src/features/home-analytics/components/` | Small presentation pieces that can inspire runtime widgets. |
| `docs/analytics/dashboard-language.md` | Dashboard-as-recipes vocabulary. |
| `docs/analytics/dashboard-recipes.md` | Copyable examples for adding metrics, charts, filters, exports, and backend fields. |
| `docs/analytics/home-dashboard-explainer-for-powerbi-js.md` | Power BI-to-JavaScript handoff model. |

## Current Backend Flow

The existing backend already has the first two runtime data sources:

| Endpoint | Route file | Service |
| --- | --- | --- |
| `GET /api/dashboard/analytics` | `src/routes/apiRoutes.js` | `src/services/dashboardAnalyticsService.js` |
| `GET /api/reports/list` | `src/routes/apiRoutes.js` | `src/services/reportListService.js` |

`GET /api/dashboard/analytics` currently:

1. Calls `loadAuthenticatedUserContext(req)`.
2. Requires a matching `users` row.
3. Calls `dashboardAnalyticsService.resolveAnalyticsScope({ authContext, userRow, organizationId, query, locationScopeService })`.
4. Calls `dashboardAnalyticsService.getDashboardAnalytics({ scope, query })`.
5. Returns analytics with range, scope, totals, facility/inspector daily rows, severity, top areas, top types, inspection type, status, and recent activity.

`GET /api/reports/list` currently:

1. Calls `loadAuthenticatedUserContext(req)`.
2. Resolves accessible organizations through the existing access policy path for non-admin users.
3. Calls `reportListService.resolveReportListScope({ authContext, userRow, organizationId, accessibleOrganizationIds, locationScopeService })`.
4. Calls `reportListService.getReportList({ scope, query })`.
5. Returns paginated preview rows.

## Existing RLS / Scope Source

There is not a separate Postgres RLS layer to replace in this plan. The existing backend enforces scope in service and route code. The runtime must reuse that path.

Reuse these exact backend helpers:

| File/function | Responsibility |
| --- | --- |
| `src/routes/apiRoutes.js` `requireAuthenticatedPortalUser(req)` | Existing portal auth gate. |
| `src/routes/apiRoutes.js` `loadAuthenticatedUserContext(req)` | Loads Auth0/auth context, user row, organization id, and organization type. |
| `src/services/locationScopeService.js` `resolveUserLocationScope()` | Resolves location/facility scoping, admin flags, memberships, selected location, and accessible location ids. |
| `src/services/accessResolver.js` | Existing organization access policy helpers used by report list routes. |
| `src/services/dashboardAnalyticsService.js` `resolveAnalyticsScope()` | Current dashboard analytics scope resolution. |
| `src/services/reportListService.js` `resolveReportListScope()` | Current report list scope resolution. |

The runtime must never trust frontend-provided organization or facility values as authority. Frontend filters are requests; the backend scope resolver decides what is allowed.

## Backend Migration Convention

The rescue backend uses numbered SQL files in `migrations/`, for example:

```text
migrations/039_inspection_scan_submissions_and_yards.sql
```

The next schema migration should follow the same style:

```text
migrations/040_analytics_dashboard_runtime.sql
```

Migration style observed:

- SQL-first migrations.
- `CREATE EXTENSION IF NOT EXISTS pgcrypto;` when UUID defaults need `gen_random_uuid()`.
- `CREATE TABLE IF NOT EXISTS`.
- `CREATE INDEX IF NOT EXISTS`.
- JSONB defaults use `'{}'::jsonb` or `'[]'::jsonb`.
- Existing org-linked tables reference `organizations(organization_id)`.

## Proposed Backend Schema

Create the registry and runtime tables in `migrations/040_analytics_dashboard_runtime.sql`:

- `analytics_dashboards`
- `analytics_dashboard_versions`
- `analytics_dashboard_permissions`
- `analytics_dashboard_layouts`
- `analytics_datasets`
- `analytics_dataset_versions`
- `analytics_dataset_fields`
- `analytics_dataset_refresh_runs`

This first pass stores definitions, versions, layouts, dataset contracts, permissions, and run history. It does not run arbitrary SQL and it does not materialize new analytic tables yet.

First supported dataset `source_type` values:

- `existing_endpoint`
- `static_demo`

Reserved but not exposed in normal upload:

- `sql_template`
- `materialized_table`
- `materialized_view`

## Proposed Backend Files

Follow the existing CommonJS service style:

```text
src/services/analyticsRuntime/
  dashboardDefinitionSchema.js
  analyticsDashboardRegistryService.js
  analyticsDatasetRegistryService.js
  analyticsScopeService.js
  analyticsDashboardValidator.js
  analyticsDashboardRenderService.js
  analyticsLayoutService.js
  analyticsRunService.js
  existingEndpointDatasetAdapter.js

src/routes/analyticsRuntimeRoutes.js
```

Mount `analyticsRuntimeRoutes.js` from `server.js` or `src/routes/apiRoutes.js` following the existing route wiring. Prefer mounting under the existing authenticated `/api` router so all current middleware remains in front of the runtime.

## Proposed Backend Runtime Responsibilities

### `analyticsScopeService`

Wrap existing auth/org/facility logic. It should return:

- user id and email
- organization id
- role/admin flags
- accessible organization ids when relevant
- selected facility/location id
- accessible facility/location ids
- module access if already available

It should call existing helpers instead of reimplementing authorization.

### `analyticsDashboardValidator`

Validate dashboard JSON definitions:

- require dashboard slug/title/version
- require datasets
- require widgets
- require layout
- require known source types
- require widget fields to exist in dataset fields
- reject unknown widget kinds
- reject arbitrary SQL unless internal/admin and disabled by default

### `existingEndpointDatasetAdapter`

Support current backend data sources:

- `dashboard_analytics`: calls `dashboardAnalyticsService.resolveAnalyticsScope()` and `getDashboardAnalytics()`
- `report_list`: calls `reportListService.resolveReportListScope()` and `getReportList()`

This adapter should call service functions directly, not HTTP loopback.

### `analyticsDashboardRenderService`

Render a dashboard server-side:

1. Load dashboard and active version.
2. Check permission using existing user/org/facility scope.
3. Validate definition.
4. Resolve datasets through adapters.
5. Return a render payload:

```json
{
  "dashboard": {},
  "version": {},
  "filters": {},
  "layout": {},
  "widgets": [],
  "data": {},
  "coverageWarnings": [],
  "freshness": {},
  "runs": []
}
```

### `analyticsLayoutService`

Load/save default, user, role, or facility layouts. Validate layout widget ids against the active dashboard definition.

### `analyticsRunService`

Record preview/manual render attempts in `analytics_dataset_refresh_runs`. No scheduler in this phase.

## Proposed Backend Routes

Add routes under `/api/analytics`:

| Method | Path | First-pass behavior |
| --- | --- | --- |
| `GET` | `/api/analytics/dashboards` | List dashboards current user can view. |
| `GET` | `/api/analytics/dashboards/:dashboardId` | Load dashboard metadata and active version if visible. |
| `POST` | `/api/analytics/dashboards/register` | Validate and create draft dashboard/version. |
| `POST` | `/api/analytics/dashboards/:dashboardId/render` | Return scoped render payload. |
| `POST` | `/api/analytics/dashboards/:dashboardId/layout` | Save a validated layout. |
| `POST` | `/api/analytics/dashboards/:dashboardId/publish` | Publish active version if user can publish. |
| `GET` | `/api/analytics/datasets` | List datasets current user can use. |
| `POST` | `/api/analytics/datasets/register` | Register draft dataset definition. |
| `POST` | `/api/analytics/datasets/:datasetId/preview` | Preview through an approved adapter. |
| `GET` | `/api/analytics/runs` | Return preview/render run history. |

## Reference Home Dashboard Definition

Create:

```text
docs/analytics/reference-home-dashboard.definition.json
```

Definition slug:

```text
home-inspection-overview
```

Datasets:

- `dashboard_analytics`
- `report_list`

Filters:

- `from`
- `to`
- `facility`
- `inspector`
- `status`
- `inspection_type`
- `vin`
- `report_id`
- `make`
- `model`
- `yard`
- `severity`
- `damage_area`

Widgets:

- total damage submissions
- damaged submissions today
- damage vs clear
- RSA reports
- facility daily trend
- inspector daily trend
- severity
- top damage areas
- top damage types

The definition must use explicit damaged and clear fields only. It must not infer damaged counts from `totalReports`, `reports`, `count`, or `totalReports - rsaReports`.

## Proposed Frontend Runtime Files

Create a general runtime without changing `/home` behavior:

```text
src/features/dashboard-runtime/
  types.ts
  runtime-client.ts
  dashboard-definition.ts
  dashboard-render-adapters.ts
  layout-utils.ts
  components/
    DashboardRuntimeShell.tsx
    DashboardViewer.tsx
    DashboardBuilder.tsx
    DashboardPicker.tsx
    DashboardUploadPanel.tsx
    DashboardFilterBar.tsx
    DashboardWidgetRenderer.tsx
    DashboardLayoutGrid.tsx
    RuntimeMetricWidget.tsx
    RuntimeChartWidget.tsx
    RuntimeTableWidget.tsx
    RuntimeCoverageAlert.tsx
    RuntimeFreshnessBadge.tsx
```

Add routes:

```text
src/app/analytics/page.tsx
src/app/analytics/[dashboardSlug]/page.tsx
src/app/analytics/builder/page.tsx
```

First-pass UI:

- `/analytics`: dashboard picker/list.
- `/analytics/:dashboardSlug`: native React dashboard viewer.
- `/analytics/builder`: paste/upload JSON, validate, register draft, render preview, publish if allowed.

No drag/drop package in this pass. Use a simple ordered layout and document drag/drop as a later enhancement.

## Definition Format

The definition format should mirror the current home visual config:

```json
{
  "slug": "home-inspection-overview",
  "title": "Home Inspection Overview",
  "version": 1,
  "datasets": [
    {
      "id": "dashboard_analytics",
      "sourceType": "existing_endpoint",
      "source": "dashboard_analytics",
      "fields": []
    }
  ],
  "filters": [],
  "widgets": [],
  "layout": []
}
```

Each widget should declare:

- id
- title
- kind
- dataset id
- measures
- dimensions
- filters/slicers
- required fields
- adapter key
- component key
- export file
- empty/coverage state

## Security Notes

- Backend owns registry, validation, rendering, and scope.
- Frontend builder never receives authority to bypass org/facility restrictions.
- Uploaded definitions are inert JSON, not executable code.
- No arbitrary SQL upload in this pass.
- `sql_template` can exist as a reserved backend enum/string, but the API must reject it unless an internal feature flag and admin-only path are added later.
- Existing endpoints remain the first data sources.
- Dataset adapters must call existing service functions and preserve current scoping.
- Permissions are additive to existing auth, not replacements for it.

## No-Code-Risk Notes

- `/home` should remain stable during initial runtime scaffolding.
- Do not move current `/home` charts into the runtime until the runtime viewer compiles and the reference definition is validated.
- Do not alter `dashboardAnalyticsService` count semantics in this pass.
- Do not stage generated frontend output.
- The rescue backend folder is outside the current writable workspace root in this Codex session. Backend implementation will require explicit write access/approval or moving the backend into a writable workspace.

## Build Order

1. Commit this planning document.
2. Add backend migration `040_analytics_dashboard_runtime.sql`.
3. Add backend validator/schema service with tests if the backend test setup is clear.
4. Add backend registry/layout/run services.
5. Add existing endpoint adapter that wraps `dashboardAnalyticsService` and `reportListService`.
6. Add authenticated `/api/analytics/*` routes.
7. Add `docs/analytics/reference-home-dashboard.definition.json`.
8. Add frontend `src/features/dashboard-runtime` types/client/components.
9. Add `/analytics`, `/analytics/:dashboardSlug`, and `/analytics/builder`.
10. Validate frontend build/export and backend lint/test/build where available.
11. Only after the runtime is stable, plan a separate migration of `/home` onto the generic runtime renderer.

## Validation Plan

Frontend:

```bash
npx eslint src/app/home/page.tsx src/app/analytics src/features/home-analytics src/features/dashboard-runtime
node node_modules/typescript/bin/tsc --noEmit --pretty false
npm run build
npm run export:validate
```

Backend:

```bash
npm test
npm run test
npm run lint
npm run build
```

Safety searches:

```bash
rg -n "totalReports - rsaReports|damageReports \\|\\| .*totalReports|Math\\.max\\(.*totalReports|totalCount - explicitClearCount" src
rg -n "Yard Damage Submission Share|yardPie|byYard|yard-damage-submission|buildYardPie|YARD_PIE" src
```

Expected result:

- no fake damaged-count fallback
- no active yard pie UI
- `/home` still builds
- new `/analytics` routes compile
- backend routes compile
- migrations are added but not run on production
