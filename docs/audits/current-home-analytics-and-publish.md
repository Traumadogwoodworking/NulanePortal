# Current Home Analytics And Static Publish Notes

Date: 2026-07-04

## Scope

This document covers the current `/home` portal analytics implementation, the damage submission reporting contract, and the static GitHub Pages publish flow.

## Home Page Code Map

- `src/app/home/page.tsx`
  - Fetches dashboard analytics with `useDashboardAnalyticsSnapshot`.
  - Fetches a small report-list preview with `useReportListSnapshot`.
  - Renders damage submission cards, daily facility bars, daily inspector bars, severity detail, and top damage areas.
  - Keeps RSA counts separate from damage submission totals.
- `src/features/home-analytics/`
  - Owns reusable dashboard types, constants, adapters, URL filter helpers, visual config, export helpers, and small presentation components.
- `src/lib/services/reportService.ts`
  - Defines `DashboardAnalyticsResponse`.
  - Calls `GET /dashboard/analytics`.
  - Calls `GET /reports/list` for paginated damage submission rows.
- `src/lib/portalData.tsx`
  - Caches and normalizes dashboard analytics requests.
  - Caps report-list snapshot page size at 50 for the UI path.
- `src/components/reports/ReportsManager.tsx`
  - Owns paginated damage report list loading.
  - Guards load-more requests so duplicate or non-advancing pages do not loop forever.

## Current Analytics Rules

- Damage submissions and RSA reports are separate. RSA is not included in damage submission totals.
- Facility and inspector charts only show clear/damaged tooltip breakdowns when the backend sends explicit split fields.
- The frontend no longer treats `totalReports`, `reports`, `count`, or `totalReports - rsaReports` as damaged submissions.
- If a row only sends totals without `noDamageReports` or `clearReports`, the UI can show totals but cannot honestly show clear/damaged split.
- URL query parameters are the shared slicer state for date, facility, inspector, status, report id, VIN, inspection type, make, model, yard, severity, and damage area.

## Dashboard Explainer Docs

- `docs/analytics/home-dashboard-explainer-for-powerbi-js.md`
- `docs/analytics/frontend-dashboard-architecture.md`
- `docs/analytics/dashboard-builder-quickstart.md`
- `docs/analytics/frontend-analytics-roadmap.md`

## Backend Adapters Still Needed

`GET /dashboard/analytics` should return these analytics adapters:

```ts
{
  totals: {
    damageReports: number,
    noDamageReports: number,
    rsaReports: number,
    damageReportsToday: number,
    noDamageReportsToday: number,
    rsaReportsToday: number,
    facilities: number,
    vins: number,
    entries: number
  },
  byFacilityDaily: Array<{
    date: string,
    facility_id?: string,
    location_id?: string,
    label: string,
    totalReports: number,
    damageReports: number,
    noDamageReports: number
  }>,
  byInspectorDaily: Array<{
    date: string,
    user_id?: string,
    email: string,
    label: string,
    totalReports: number,
    damageReports: number,
    noDamageReports: number
  }>,
  byInspector: Array<{
    user_id?: string,
    email: string,
    label: string,
    reportCount: number,
    damageReports: number,
    noDamageReports: number
  }>,
  byFacility: Array<{
    facility_id?: string,
    location_id?: string,
    label: string,
    totalReports: number,
    damageReports: number,
    noDamageReports: number,
    rsaReports: number,
    vins: number,
    entries: number
  }>,
  byInspectionType: Array<{
    number: string,
    label: string,
    count: number
  }>,
  severity: Array<{
    level: string,
    label: string,
    count: number
  }>,
  topAreas: Array<{ name: string, count: number }>,
  topTypes: Array<{ name: string, count: number }>
}
```

Optional future adapter if the yard pie is brought back:

```ts
{
  byYard: Array<{
    yard_id?: string,
    yardName: string,
    assignedFacility?: string,
    facility_id?: string,
    location_id?: string,
    totalReports: number,
    damageReports: number,
    noDamageReports: number
  }>
}
```

`GET /reports/list` should keep returning lightweight rows with:

- `report_id`
- `vin`
- `created_at` or `submitted_at`
- `inspector_email`
- `facility_id` or `location_id`
- `facility`, `facilityName`, `location_label`, or `location_name`
- `yard`, `yardName`, or `yard_name`
- `damage_status: "damage" | "no_damage" | "unknown"`
- `scan_status` for clear inspection scan submissions
- media links where available

## Static Publish Flow

Use the production static export. Do not publish stale `out/` contents.

```bash
npm run build
npm run export:validate
```

The GitHub Pages branch should receive only the static export:

- copy `out/` into a temporary `gh-pages` checkout
- preserve `CNAME`
- ensure `.nojekyll` exists
- commit and push `gh-pages`

The generated site is a root custom-domain export, so assets should resolve from `/_next/...`, not from a nested base path.
