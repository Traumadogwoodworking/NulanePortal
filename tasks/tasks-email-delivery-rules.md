# Email Delivery Rules Rewrite

## Objective
- Replace the legacy Email page with a single Delivery Rules editor backed by a canonical portal rule shape.

## Basis
- Current Email page is a legacy email-list/rule-builder hybrid in src/app/delivery-rules/page.tsx, re-exported by src/app/email/page.tsx.
- Control routes already map /delivery-rules to routing policies/share rules and /control/settings to email-lists.
- Damage taxonomy constants already exist in src/lib/docudent/damageTaxonomy.ts and are used by the damage/report UI.
- Org-scoped facilities are available through the portal directory snapshot.

## Relevant Files
- src/app/email/page.tsx
- src/app/delivery-rules/page.tsx
- src/lib/types.ts
- src/lib/portalData.tsx
- src/lib/services/notificationsService.ts
- src/lib/services/reportService.ts
- src/lib/docudent/damageTaxonomy.ts
- src/lib/controlRoutes.ts
- src/lib/services/facilitiesService.ts
- docs/PORTAL_ENDPOINT_INVENTORY.md
- docs/PORTAL_LEGACY_ALIGNMENT_AUDIT.md

## Risks
- Backend contract does not yet exist for the canonical delivery-rule JSON.
- Need to avoid accidental widening of org/facility scope.
- Need to preserve existing unrelated portal surfaces and routing.

## Progress
- [ ] Inspect current portal page and backend-adjacent contract docs.
- [ ] Define canonical portal rule types and search helpers.
- [ ] Replace the Email page UI with a single Delivery Rules editor.
- [ ] Add portal adapter/TODO contract section for backend support if needed.
- [ ] Verify with targeted lint/typecheck/build where available.

## Verification Plan
- eslint on changed frontend files.
- typecheck/build if the repo has a supported script.
- manual review of rule shape, substring search, and org-scoped facility sourcing.

## Deferred Items
- Backend implementation and database migration are intentionally out of scope for this portal-only task.
