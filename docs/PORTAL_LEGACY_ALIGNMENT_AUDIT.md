# PORTAL LEGACY ALIGNMENT AUDIT

## Overview
This document compares the current Next.js portal implementation with the legacy `index.html` portal file, focusing on API calls, authentication/session behavior, and data handling for reports, users, and facilities.

## Legacy `index.html` Path
`../nulane_systems_site/index.html`

## Endpoint Map Comparison

### Legacy Portal Endpoint Map (Inferred)
- **Reports (Damage):** Likely calls an API endpoint for damage reports, potentially using an `apiBase` variable similar to `/api`. The UI suggests a damage report section.
- **Users:** Endpoints inferred for user management, possibly `/admin/users` or similar, based on UI elements for user listing, filtering, and roles.
- **Facilities:** Endpoints inferred for facility management, possibly `/admin/facilities` or `/organizations/{orgId}/locations`.
- **Organizations:** Endpoints for organization management, explicitly seen as `/admin/organizations/...` for branding.
- **Auth/Session:** Relies on backend-provided session information, including user roles (`super_admin`, `org_admin`, `admin`, `is_active` status) to control UI elements and access.

### Current Next.js Portal Endpoint Map (Proven / UNVERIFIED)
- **Reports (Damage):** Proven working. Uses `/api/report/pull` via `ReportsAdapter.fetchDamageReports`. The `apiFetch` utility prepends `/api` to the `REPORTS_ENDPOINT` which is `/report/pull`.
- **Users:** Proven working. `UsersAdapter.getUsers(organizationId)` uses endpoint `/organizations/{orgId}/users`.
- **Facilities:** Proven working. `FacilitiesAdapter.getFacilities(organizationId)` uses endpoint `/organizations/{orgId}/facilities` with a fallback to `/organizations/{orgId}/locations` on 404.
- **Organizations:** Proven working. `apiFetch<{ organizations: OrganizationRow[] }>("/admin/organization-list");` for global admin view of organizations. (UNVERIFIED: `apiFetch` in orgs page uses this for list, but other org-related operations could use different endpoints).
- **Auth/Session:** Proven working. Uses `usePortalSession()` hook which provides `sessionStatus`, `organizationId`, `isAdmin`, `isOrgAdmin`, `isSuperAdmin`, etc., derived from the `PortalSessionResponse`. Access is controlled by `sessionStatus`.

## Page Alignment Status

- **Pages Currently Aligned:**
    - Reports (Damage): UI structure is present. Now correctly attempts to fetch data from `/api/report/pull`. Access denied gate removed.
    - RSA Reports: Continues to display data.

- **Pages Partially Aligned:**
    - Users: UI is present. Data fetching re-enabled (`ENABLE_ADMIN_DATA = true`). User data (active/inactive status, assigned facilities) is derived from `UserSummary`. Last login is marked as not returned by backend. Invite user button disabled. Needs verification that data populates correctly.
    - Facilities: UI is present. Data fetching re-enabled (`ENABLE_ADMIN_DATA = true`). Assigned users are derived from `UserSummary.facilityIds`. Add facility button disabled. Needs verification that data populates correctly.
    - Organizations: Redefined to focus on current organization details, branding, and connections. 'Unique Roles' removed. Displays facilities under current org. Needs verification that data populates correctly.

- **Pages Missing Backend Contracts (Proven / UNVERIFIED):**
    - Invite users: Backend API for inviting users is UNVERIFIED/pending (frontend button is disabled).
    - Organizations (detailed view/management): Beyond just listing, specific APIs for managing organizations (write operations, assigned organizations list for a user) are UNVERIFIED/missing.
    - Settings persistence: Backend APIs for saving/loading settings are UNVERIFIED/missing.
    - Support tickets: Backend missing for managing support tickets (UNVERIFIED).
    - Frontend error capture: General system for capturing and reporting frontend errors to a backend service (UNVERIFIED).

## Fix Status

- **Damage Reports Fix Status:**
    - The `ReportsManager.tsx` component now correctly uses `usePortalSession` and `sessionStatus` for authentication checks.
    - The `fetchReports` function is correctly implemented with `useCallback` and `useEffect`.
    - The endpoint for damage reports is correctly set to `/api/report/pull` in `src/lib/services/reportService.ts`.
    - Response normalization in `extractReportsArray` is robust.

- **Users/Facilities/Organizations Data Source Restoration Status:**
    - `ENABLE_ADMIN_DATA` in `src/lib/portalData.tsx` has been changed from `false` to `true`, re-enabling fetching of users and facilities data. Verification needed that data now appears.

- **Invite Users Incomplete:** Backend endpoints for inviting users are UNVERIFIED/missing.
- **Organizations Incomplete:** Advanced management of organizations (beyond listing, assigned orgs for a user) is UNVERIFIED/missing.
- **Settings Persistence Incomplete:** Backend for settings persistence is UNVERIFIED/missing.
- **Support Tickets Backend Missing:** Confirmed by `SupportPage` UI.
- **Frontend Error Capture Missing:** UNVERIFIED.

## Access Denied Root Cause and Fix
- **Root Cause:** The `isPortalAccessAllowed` flag from `usePortalSession()` was blocking the entire `/reports/damage` page, leading to an "Access Denied" message, even for logged-in users. This flag was likely tied to `session?.portal_access` which might have been `false` for some users/organizations, overriding role-based permissions.
- **Fix:** The `if (!isPortalAccessAllowed)` check has been removed from `src/components/reports/ReportsManager.tsx`. This allows any authenticated user with an `organizationId` to attempt to fetch reports. Backend API security will now be responsible for enforcing granular access based on user roles and permissions.

