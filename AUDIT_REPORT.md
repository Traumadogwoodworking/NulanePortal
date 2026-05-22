## Audit Report: Admin, Support, and Settings

### Page Audit

#### /settings

1.  **Current sections/cards/tables/actions:**
    -   A "Session Summary" card with user email, role, and organization.
    -   An "Environment" card with API base URL and environment.
2.  **What real data it uses:**
    -   `usePortalSession` to get session information.
    -   `portalConfig` to get environment information.
3.  **What fields are shown:**
    -   User email, role, organization name, organization ID.
    -   Environment, API base URL.
4.  **What important fields are missing:**
    -   No actual settings or controls are available.
    -   No way to manage user preferences.
5.  **Whether it is useful enough for production:**
    -   No, it's a read-only display of information.
6.  **Exact next improvements needed:**
    -   Implement theme/preference controls.
    -   Add a section for user profile settings.

#### /organizations

1.  **Current sections/cards/tables/actions:**
    -   A card with the current organization's name and ID.
    -   Stat cards for the number of users and facilities.
    -   A card with the user's role.
    -   A card explaining that organization management is not configured.
2.  **What real data it uses:**
    -   `usePortalSession` to get the current organization and user role.
    -   `usePortalDirectorySnapshot` to get the number of users and facilities.
3.  **What fields are shown:**
    -   Organization name, organization ID, number of users, number of facilities, user role.
4.  **What important fields are missing:**
    -   A list of all organizations.
    -   Actions to create, edit, or delete organizations.
    -   Organization status, modules, branding, etc.
5.  **Whether it is useful enough for production:**
    -   No, it's a read-only display of the current organization.
6.  **Exact next improvements needed:**
    -   Implement a backend service to fetch and manage all organizations.
    -   Display a table of all organizations with their details.
    -   Add actions to manage organizations.

#### /facilities

1.  **Current sections/cards/tables/actions:**
    -   Stat cards for total sites, active readiness, and site assets.
    -   A data table with a list of facilities.
    -   A details panel for the selected facility.
    -   Search and refresh actions.
2.  **What real data it uses:**
    -   `usePortalDirectorySnapshot` which calls `FacilitiesAdapter.getFacilities`.
3.  **What fields are shown:**
    -   Facility name, slug, region, site count, status.
    -   In the details panel: facility name, ID, status, region, site count, organization ID, and assigned users.
4.  **What important fields are missing:**
    -   No way to create, edit, or delete facilities.
    -   Last activity, created/updated timestamps.
5.  **Whether it is useful enough for production:**
    -   It's a good start, but it's read-only.
6.  **Exact next improvements needed:**
    -   Implement a backend service to create, update, and delete facilities.
    -   Add actions to manage facilities.

#### /users

1.  **Current sections/cards/tables/actions:**
    -   Stat cards for total users, active users, and admin users.
    -   A data table with a list of users.
    -   A details panel for the selected user.
    -   Search and filter actions.
2.  **What real data it uses:**
    -   `usePortalDirectorySnapshot` which calls `UsersAdapter.getUsers`.
3.  **What fields are shown:**
    -   User name, email, role, status, facility access.
    -   In the details panel: user name, email, role, status, facility access, organization scope, and role explanation.
4.  **What important fields are missing:**
    -   No way to create, edit, or delete users.
    -   Last login, created/updated date, permissions, invitation status.
5.  **Whether it is useful enough for production:**
    -   It's a good start, but it's read-only.
6.  **Exact next improvements needed:**
    -   Implement a backend service to create, update, and delete users.
    -   Add actions to manage users and their roles.

#### /support

1.  **Current sections/cards/tables/actions:**
    -   A contact card with a link to a support form.
    -   An escalation card.
    -   A technical details card.
2.  **What real data it uses:**
    -   `portalConfig.supportFormUrl`.
3.  **What fields are shown:**
    -   A link to the support form.
    -   Technical details like API base and environment.
4.  **What important fields are missing:**
    -   A real ticketing system.
    -   A list of existing tickets.
    -   A way to create a new ticket from within the portal.
5.  **Whether it is useful enough for production:**
    -   No, it's just a link to an external form.
6.  **Exact next improvements needed:**
    -   Implement a full-fledged ticket system with a backend.

### Data Source Audit

#### Users

-   **id:** `user_id`
-   **name/display name:** `display_name`, `first_name`, `last_name`
-   **email:** `email`
-   **role:** `role`
-   **status:** `is_active`
-   **last login:** Not available.
-   **created date:** `created_at` (in dev mock)
-   **updated date:** `updated_at`
-   **assigned facilities:** `location_memberships`
-   **assigned organizations:** `organization_membership`
-   **permissions:** `permissions`
-   **invitation status:** `invite` (in `createUser` payload)
-   **auth provider/Auth0 fields:** Not directly exposed, but the session is managed by Auth0.

#### Facilities

-   **id:** `location_id`
-   **slug/code:** `slug`
-   **name:** `location_name`, `display_name`
-   **organization id:** `organization_id`
-   **region/location:** `region`, `city`, `state`
-   **active status:** `is_active`
-   **location count/site count:** `locationCount`
-   **assigned users:** Not directly available, but can be derived from `Users` data.
-   **reports count:** Not available.
-   **last activity:** Not available.
-   **created/updated timestamps:** Not available.

#### Organizations

-   **id:** `organization_id`
-   **name:** `name`
-   **status:** `type`
-   **modules:** `isModuleEnabled` function in `src/lib/modules.ts`.
-   **users count:** Can be derived from `Users` data.
-   **facilities count:** Can be derived from `Facilities` data.
-   **branding:** `branding_snapshot` in `PortalSessionResponse` and `fetchBranding` service.
-   **Power BI/dashboard config:** `powerBiEmbedUrl` in `branding_snapshot`.
-   **support config:** `supportFormUrl` in `portalConfig`.
-   **billing/subscription/tenant info if present:** `plan_tier`

#### Settings

-   **theme/preferences:** Not available from the backend, but can be stored in local storage.
-   **branding config:** Available via `fetchBranding` service.
-   **module visibility:** `isModuleEnabled` function in `src/lib/modules.ts`.
-   **user profile/session settings:** `usePortalSession` hook.
-   **org settings:** Not available.
-   **support form URL:** `supportFormUrl` in `portalConfig`.
-   **API base/environment:** `apiBase` and `environment` in `portalConfig`.

#### Support

-   **support form URL:** `supportFormUrl` in `portalConfig`.
-   **escalation contacts:** Not available.
-   **ticket endpoints if any:** Not available.
-   **account manager/contact info:** Not available.
-   **existing backend ticket model if any:** Not available.
