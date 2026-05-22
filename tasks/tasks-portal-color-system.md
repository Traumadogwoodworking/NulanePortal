# Portal Color System Cleanup

## Objective
Centralize the portal color system so page titles stay blue, but page bodies, headers, table titles, labels, buttons, links, badges, and general content stay slate/black unless status-specific.

## Basis
- User requested a global inventory first, then centralization.
- Current shared UI uses blue/brand accents in several body/header components.
- Top page title blue is allowed; sidebar active light blue is allowed.

## Relevant Files
- src/components/ui/PageTitle.tsx
- src/components/ui/Card.tsx
- src/components/ui/PageSection.tsx
- src/components/ui/PageSectionHeader.tsx
- src/components/ui/DataTableShell.tsx
- src/components/reports/ReportsManager.tsx
- src/components/reports/RsaReportsManager.tsx
- src/app/organizations/page.tsx
- src/app/facilities/page.tsx
- src/app/users/page.tsx
- src/app/support/page.tsx
- src/app/settings/page.tsx
- src/app/branding/page.tsx
- src/app/delivery-rules/page.tsx
- src/components/PortalSidebar.tsx
- src/components/PortalTopBar.tsx

## Risks
- Over-broad token changes could affect status colors and active nav states.
- Some blue classes are intentional, e.g. sidebar active state and top page title.
- Stale backup files may be imported accidentally if not ignored carefully.

## Progress
- [x] Inventory all blue/brand/cyan/sky/indigo/fuchsia classes and classify allowed vs wrong.
- [x] Update shared UI tokens/components to enforce blue only on top page title.
- [x] Remove blue/brand accents from shared page body components.
- [x] Apply the light body background, stronger card shadows, centered sidebar logo, and home-page dashboard refresh.
- [x] Run `npm run lint`.
- [x] Run `npm run build` attempt; blocked by external Google Fonts fetch failure.
- [ ] Final residual-color audit for page-specific surfaces still using blue/brand/cyan accents.

## Verification Plan
- Repo-wide color-class inventory before edits.
- Lint and build after edits.
- Final residual-color audit.

## Deferred Items
- Page-specific control, branding, report-op, RSA, docufit, and AWCT accents still need a separate pass if the goal is literally zero body-level accent color outside status states.
