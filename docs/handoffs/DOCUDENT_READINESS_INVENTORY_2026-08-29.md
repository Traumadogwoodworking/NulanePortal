# DocuDent readiness inventory and continuation

Date: 2026-08-29
Portal worktree: `/Users/home/Desktop/Codex/apps/docudent-portal`
Portal branch: `codex/docudent-portal-convergence-20260826`

## Purpose

This document separates the portal UI work that is safe to complete in this
worktree from the identity, data-access, privacy, cache, mobile-guide, and
deployment work that requires a coordinated backend or device pass. It is an
implementation handoff, not a claim that the full DocuDent review goal is done.

## Completed in the current portal pass

- The portal shell now reaches the browser edges. The sidebar and content area
  no longer sit inside a rounded, padded outer card.
- The sidebar product card was removed.
- Sidebar navigation and the account control now use opaque surfaces instead
  of frosted translucent fills.
- The header is an opaque, left-aligned page header. It no longer repeats the
  `Nulane Systems` text, uses outlined text, or applies a gradient/glow.
- Decorative radial gradients, backdrop blur, and the shared card glow were
  removed from the active portal, login, callback, modal, report, and analytics
  components.
- The portal theme is fixed to one light theme for this review target so an old
  local theme preference cannot make pages render with a different template.
- Settings, Support Tickets, Damage Submissions, and Home now share the same
  content edge and bottom spacing. Duplicate page titles were removed from
  Settings and Support Tickets because the shell already owns the page title.
- `/home` again renders the existing `HomeDashboard` analytics implementation
  used by the earlier portal rather than the temporary welcome/shortcut hero.

Primary UI files:

- `src/components/PortalLayoutShell.tsx`
- `src/components/PortalSidebar.tsx`
- `src/components/PortalTopBar.tsx`
- `src/lib/brandingPresets.ts`
- `src/components/ui/Card.tsx`
- `src/lib/portalTheme.tsx`
- `src/app/home/page.tsx`
- `src/features/home-analytics/HomeDashboard.tsx`
- `src/components/reports/ReportsManager.tsx`

## Current visual-verification blocker

The local portal serves `/home/` with HTTP 200, but the browser reaches
`Connection interrupted` because `/api/user/me` cannot be fetched. The ignored
local portal environment currently points `NEXT_PUBLIC_API_BASE_URL` at
`https://api.nulanesystems.com/api`. Browser acceptance is therefore blocked by
the API/auth/CORS boundary, not by the Next.js route.

Do not add an in-browser tenant fixture or weaken authentication to obtain a
screenshot. `src/lib/devMockApi.ts` intentionally disables browser response
mocks so a review build cannot inherit customer data or an unrelated tenant.
A fresh authenticated screenshot pass must use the isolated DocuDent dev API.

The screenshot captured during this pass is stored outside source control at:

`/Users/home/.codex/visualizations/2026/08/29/01a04b80-0c44-7903-8beb-49e699e08c69/docudent-current-home.png`

It records the API blocker only and is not UI acceptance evidence.

## Authoritative backend candidate

Do not implement the shared demo organization in the portal client.

- Candidate checkout:
  `/Users/home/Desktop/Codex/worktrees/docudent-backend-convergence-20260827`
- Branch:
  `codex/docudent-backend-convergence-20260827`
- Remote:
  `docudent-gitlab/codex/docudent-backend-convergence-20260827`
- State observed during inventory: clean and tracking its remote.
- Workspace manifest labels `/Users/home/Desktop/Codex/apis/docudent-api-cicd`
  only `LIKELY`; that checkout is five commits behind its staging remote.
- The collected mobile repository's `docudent-api/` directory is historical and
  is not the deployed API authority.

Relevant backend files:

- `src/routes/apiRoutes.js`
  - `GET /user/me` resolves trusted organization state and calls
    `membershipService.syncUserFromIdentity()`.
  - `canViewAllReportsForUser()` currently grants organization-wide report
    visibility only to admin-like users.
  - Report list paths currently add a `user_uuid` filter for non-admin users.
- `src/services/membershipService.js`
  - Owns durable user and organization-membership synchronization.
- `src/services/accessControlService.js`
  - Has a free-tier organization fallback, but that is not the requested
    isolated DocuDent demo-org contract.
- `test/userMeAutoMembership.test.js`
  - Proves identity sync after organization resolution, but its fixture still
    contains inherited customer identity and must not be copied into DocuDent.
- `test/userMeScope.test.js`, `test/phase5UserAccess.test.js`, and
  `test/phase5UserAccessRoutes.test.js`
  - Existing authorization regression coverage to extend.

## Demo organization implementation contract

The safe design is an isolated DocuDent-dev feature, not a global tenant
fallback in the shared API.

1. Add a server-only config contract such as
   `DOCUDENT_DEMO_ORGANIZATION_ID` plus an explicit environment enable flag.
   Validate that the ID is a UUID and that the organization exists at startup.
2. Seed the organization with an idempotent migration or deployment seed. Do
   not use an Auth0 organization ID as the database organization ID unless a
   deliberate mapping table says they are the same.
3. In the isolated DocuDent `/user/me` bootstrap, when an authenticated user has
   no active membership, assign the configured demo organization and call
   `membershipService.syncUserFromIdentity()` transactionally. Repeated calls
   must be idempotent.
4. Preserve fail-closed behavior for conflicting active memberships, disabled
   users, invalid identity email, or a request hitting a non-DocuDent runtime.
5. Do not hardcode the demo organization in the browser or Auth0 login request.
   Auth0 establishes identity; the API owns membership.
6. Add tests for first login, repeat login, existing matching membership,
   conflicting membership, disabled user, missing demo org, concurrent first
   login, and non-DocuDent runtime isolation.

The portal currently sends no explicit DocuDent tenant header. The dev API must
therefore be isolated by deployment/configuration, or a signed/server-trusted
product discriminator must be added. Do not trust a client-supplied header by
itself to grant organization membership.

## Shared report heap

The requested behavior is: all active members of the DocuDent demo organization
can see all reports in that organization.

Current backend behavior adds `user_uuid` to report queries for non-admin users.
Changing every demo user to `admin` would over-grant unrelated administration
permissions and is not acceptable.

Implement an explicit visibility policy, for example
`canViewOrganizationReportHeap({ userRow, organizationId })`, that returns true
only when:

- the runtime is the isolated DocuDent demo runtime;
- `organizationId` equals the configured demo organization;
- the user has an active membership in that organization; and
- the permission is limited to report read/list/analytics operations.

Apply the same policy to every report list, detail, filter-options, analytics,
export, media-signing, and attachment path. Keep report creation ownership and
mutation authorization separate from read visibility. Extend the phase-5 route
tests so a user cannot request another organization or mutate another user's
report merely because the shared read heap is enabled.

## Email censoring and privacy

Do not overwrite or hash canonical identity emails in the database. The API
still needs verified email for authentication, support, audit, and delivery.

The current portal can receive and cache raw `inspector_email` values in report
rows, analytics buckets, tooltips, filters, CSV exports, and local/session
storage. Masking only the visible React label would leave the raw value in
browser data and downloads.

Recommended contract:

- Generate a stable organization-scoped alias on the server, such as
  `Inspector 042`, from an HMAC of organization ID plus canonical user ID.
- Return `inspector_display_name` or `submitter_alias` to demo members.
- Omit raw email from demo-member list, analytics, filter, export, and media
  payloads. Return raw email only to a separately authorized support/admin
  surface when required.
- Update portal adapters to prefer the alias and reject accidental raw-email
  fields in the demo response contract.
- Add response, export, log, cache, and snapshot tests proving that no raw email
  reaches a normal demo member.

## Cache inventory

Portal cache authority is primarily `src/lib/portalData.tsx` and
`src/lib/portalCacheStorage.ts`.

- Global SWR deduping/stale interval: five minutes.
- Directory, branding, report, control, and analytics data use a mixture of
  memory, `localStorage`, and `sessionStorage`.
- Several reads pass `allowStale: true`, so persisted data can render before
  revalidation even after the normal five-minute TTL.
- Directory and report snapshots revalidate on focus/reconnect.
- Dashboard analytics and home snapshots explicitly do not revalidate on focus
  or reconnect.
- Report list uses SWR memory without the same persisted snapshot wrapper.
- API GET requests use `cache: "no-store"`; the inconsistent behavior is in
  the client snapshot/SWR layer, not the browser HTTP cache.
- Cache scopes contain user ID, organization ID, organization view, and filters
  in different combinations. This must be reviewed before shared-report mode so
  one user cannot see a stale payload from a previous identity on a shared
  browser.

Follow-up should define one table of cache policies per data class: key scope,
storage, TTL, stale-display allowance, focus/reconnect behavior, mutation
invalidation, logout clearing, and schema-version key. Bump cache versions when
the email alias and shared-report response shapes change.

## DocuDent quick-start guide inventory

The guide should be built from the current DocuDent mobile source and fresh
DocuDent screenshots, not the portal's inherited image library.

Authoritative mobile workflow:

- Product-module gate: `lib/config/product_modules.dart`
- Start action: `Damage Submission` in
  `lib/features/dashboard/presentation/screens/dashboard_screen.dart`
- VIN flow: `lib/features/vin_scan/presentation/vin_scan_screen.dart`
- Workflow enum: `lib/models/report_models.dart`
- Final review and submission: `lib/screens/report_review_screen.dart`

The current eight documented steps are:

1. VIN Entry
2. Damage Selection
3. Photo Capture
4. Damage Type
5. Severity Rating
6. Comments and Video
7. Final Review
8. Submit Report

Guide content should also explain offline drafts/resume, the difference between
queued and fully submitted, retaking unreadable photos, and where to find a
submitted report in the portal.

Do not use `public/images/app-photo-*` or `public/images/app-showcase-*` as
guide assets without a complete review. The inspected files include visible
Inspection-Trac/AWCT identity and disabled modules. Capture fresh screenshots
from the current DocuDent iPhone build after the demo organization and API are
working. Redact VINs, people, email, location, report IDs, and media before
committing guide assets.

Recommended guide UI after approved screenshots exist:

- Keep visible primary navigation unchanged.
- Add a `Quick start` link inside Settings or the Home help area, not a fifth
  sidebar item.
- Use one responsive guide template with a numbered step rail, one real device
  screenshot per step, short action copy, and a compact troubleshooting panel.
- Provide an accessible HTML route first; generate a PDF from the same content
  only if a review or support workflow requires it.

## Remaining visual consistency inventory

The shared shell is normalized, but full page-by-page visual acceptance remains
blocked until authenticated data loads. The next visual pass must capture Home,
Damage Submissions list/detail, Support Tickets, and Settings at the same
viewport and verify:

- left/right content edges align across routes;
- table headers, filters, empty states, loading states, and dialogs use the same
  radius, border, spacing, and button heights;
- no hidden product/customer branding is supplied by API snapshots;
- responsive behavior at desktop, tablet, and narrow mobile widths;
- focus visibility, keyboard order, contrast, and reduced-motion behavior;
- no duplicate titles or route-specific outer containers;
- no stale cached page uses a previous theme or identity after logout/login.

## Acceptance sequence

1. Implement and test the isolated backend demo organization.
2. Implement organization-wide report-read policy without admin escalation.
3. Implement server-side email aliases and purge/version old client caches.
4. Point the local portal at the isolated dev API and complete real Auth0 login.
5. Capture and fix all four portal routes at common viewports.
6. Capture fresh DocuDent iPhone screenshots and build the quick-start route.
7. Run portal tests/build, backend focused suites, authenticated cross-user
   acceptance, logout/cache isolation, and connected-iPhone submission proof.
8. Commit and deploy only to isolated DocuDent targets, then stop for Matt's
   review.
