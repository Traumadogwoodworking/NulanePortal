# Inspection-Trac portal UI completion

Status: Complete
Completed: 2026-08-08

## Completed work

### Home dashboard pie charts

- Reworked severity and damage-area charts as solid pie charts with the totals moved into clear metric strips above each chart.
- Preserved the existing portion labels, counts, percentages, legend content, filtering, and export behavior.
- Increased label readability and spacing, removed the distracting bordered label treatment, and added cleaner callout padding and leader-line placement.
- Verified the charts in the managed real-Auth0 portal at `http://localhost:3000/`.

### Resources page

- Added Resources to the portal support navigation and removed the organization-scope selector from that page header.
- Lists every facility returned by the live directory with its region, location and yard context, active state, and facility workspace link.
- Keeps each facility's enrollment link, iPhone and Android app links, setup checklist, support context, packet revision, and access PDF together.
- Adds a per-facility access-PDF download that uses the existing typed registration configuration and the existing two-sided facility guide definition. Facilities without a configured registration URL show the exact next action instead of a fabricated link.
- Adds short mobile-app and portal explainers so inspectors and coordinators can understand where each part of the workflow belongs.

## Verification

- `npx eslint src/app/resources/page.tsx`
- `npx tsc --noEmit`
- `git diff --check`
- Managed `next-site` runner is healthy and serving the real-Auth0 portal on port `3000`.

## Scoped files

- `src/app/resources/page.tsx`
- `src/components/facilities/facilityStartupGuide.ts`
- `src/components/PortalLayoutShell.tsx`
- `src/components/PortalTopBar.tsx`
- `src/features/home-analytics/HomeDashboard.tsx`
- `src/lib/navigation.ts`
- `src/lib/portalSession.tsx`

Unrelated working-tree changes remain untouched and are intentionally excluded from the completion commit.
