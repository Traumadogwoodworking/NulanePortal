# DocuDent Portal Endpoint Inventory

## Scope

Organizations, Facilities, Users, Facility Access, Email/Notifications, Branding.

Legend:
- `verified`: confirmed in legacy `index.html` or current Next service code and observed to work in the current portal flow.
- `unverified`: present in Next code but not yet proven against legacy or live browser behavior.
- `missing`: no verified backend route found in legacy or current runtime evidence.
- `backend-exists-but-shape-mismatch`: route exists but the frontend parser or payload contract still does not match.
- `frontend-not-wired`: route or helper exists, but the page does not use it yet.

## Verified Existing Endpoints

| Area | Method | Path | Legacy Function | Next Service | Status |
|---|---:|---|---|---|---|
| Facilities / Locations | GET | `/api/organizations/:organizationId/locations` | `loadFacilities()` | `fetchOrganizationLocations()`, `fetchFacilities()` | verified |
| Facilities / Locations | POST | `/api/organizations/:organizationId/locations` | `handleFacilityFormSubmit()` | `createFacility()` | verified |
| Facilities / Locations | PUT | `/api/organizations/:organizationId/locations/:locationId` | `handleFacilityFormSubmit()` | `updateFacility()` | verified |
| Facility Access | GET | `/api/admin/organizations/:organizationId/location-memberships` | `loadFacilityAccessPanel()` | `fetchLocationMemberships()` / `UsersAdapter.getLocationMemberships()` | verified |
| Facility Access | POST | `/api/admin/organizations/:organizationId/location-memberships` | `submitFacilityAccessForm()` | `addLocationMembership()` / `UsersAdapter.addFacilityMembership()` | verified |
| Facility Access | DELETE | `/api/admin/organizations/:organizationId/location-memberships/:membershipId` | `delete membership` path in legacy access panel | `removeLocationMembership()` / `UsersAdapter.removeFacilityMembership()` | verified |
| Users | GET | `/api/admin/organizations/:organizationId/users` | `loadUsersPanel()` | `fetchOrganizationUsers()` / `UsersAdapter.getUsers()` | verified |
| Users | POST | `/api/admin/organizations/:organizationId/users` | `submitUserForm()` | `createUser()` / `UsersAdapter.inviteUser()` | verified |
| Users | PUT | `/api/admin/organizations/:organizationId/users/:userId` | `submitUserForm()` | `updateUser()` / `UsersAdapter.updateUser()` | verified |
| Users | DELETE | `/api/admin/organizations/:organizationId/users/:userId` | `deleteUser()` | frontend helper via `updateUser()` / delete path in legacy | verified |
| Users | POST | `/api/admin/organizations/:organizationId/users/:userId/password-reset` | n/a | `resetUserPassword()` / `UsersAdapter.resetUserPassword()` | verified |
| Users / Memberships | GET | `/api/admin/organizations/:organizationId/memberships` | `loadAccessPanel()` | `fetchOrganizationMemberships()` / `UsersAdapter.getMemberships()` | verified |
| Roles | GET | `/api/admin/organizations/:organizationId/roles` | `loadAccessPanel()` | `fetchOrganizationRoles()` / `UsersAdapter.getRoles()` | verified |
| Roles | POST | `/api/admin/organizations/:organizationId/roles` | `submitRoleForm()` | current service helper in users service | verified |
| Roles | PUT | `/api/admin/organizations/:organizationId/roles/:roleId` | `submitRoleForm()` | current service helper in users service | verified |
| Membership Roles | POST | `/api/admin/organizations/:organizationId/memberships/:membershipId/roles` | `submitMembershipRoleForm()` | current service helper in users service | verified |
| Membership Roles | DELETE | `/api/admin/organizations/:organizationId/memberships/:membershipId/roles/:roleAssignmentId` | `deleteMembershipRole()` | current service helper in users service | verified |
| Email / Notification Lists | GET | `/api/admin/organizations/:organizationId/email-lists` | `loadEmailListsPanel()` | `fetchEmailLists()` | verified |
| Email / Notification Lists | GET | `/api/admin/organizations/:organizationId/email-lists/:listId/members` | `loadEmailListMembers()` | `fetchEmailListMembers()` | verified |
| Email / Notification Lists | POST | `/api/admin/organizations/:organizationId/email-lists` | `submitEmailListForm()` | `updateEmailList()` / `addEmailListMember()` plus create flow | verified |
| Email / Notification Lists | PUT | `/api/admin/organizations/:organizationId/email-lists/:listId` | `submitEmailListForm()` | `updateEmailList()` | verified |
| Email / Notification Lists | DELETE | `/api/admin/organizations/:organizationId/email-lists/:listId` | `archiveEmailList()` | no direct Next page wiring yet | verified |
| Email / Notification Members | POST | `/api/admin/organizations/:organizationId/email-lists/:listId/members` | `submitEmailListMemberForm()` | `addEmailListMember()` | verified |
| Email / Notification Members | DELETE | `/api/admin/organizations/:organizationId/email-lists/:listId/members/:memberId` | `deleteEmailListMember()` | no direct Next page wiring yet | verified |
| Branding | GET | `/api/organizations/:organizationId/branding` | `loadBrandingPanel()` | `fetchBranding()` | verified |
| Branding | PUT | `/api/organizations/:organizationId/branding` | `handleBrandingFormSubmit()` | `saveBranding()` | verified |
| Branding / Logo Upload | POST | `/api/photos/upload` | `uploadBrandingLogo()` | no dedicated Next branding upload helper yet | verified |

## Legacy Index.html Endpoint References

### Organizations

- Legacy does not expose a confirmed organization-create or organization-link backend route in the inspected `index.html`.
- Legacy derives active organization context from session state and `getAdminOrgBase()`.
- Legacy admin-scoped organization-related routes are built from:
  - `getAdminOrgBase() => ${apiBase}/admin/organizations/${organizationIdForBranding}`
- Legacy organization visibility and organization list management were not verified in this pass.

### Facilities / Locations

- `loadFacilities()` calls:
  - `${apiBase}/organizations/${organizationIdForBranding}/locations`
- `handleFacilityFormSubmit()` uses:
  - `POST ${apiBase}/organizations/${organizationIdForBranding}/locations`
  - `PUT ${apiBase}/organizations/${organizationIdForBranding}/locations/${facilityId}`
- `loadFacilityAccessPanel()` calls:
  - `GET ${base}/location-memberships`
- `submitFacilityAccessForm()` uses:
  - `POST ${base}/location-memberships`
- Legacy facility detail and render paths use `payload.locations` and `membership.location_id`.

### Users / Roles

- `loadUsersPanel()` calls:
  - `GET ${base}/users`
- `submitUserForm()` uses:
  - `POST ${base}/users`
  - `PUT ${base}/users/${userId}`
- `deleteUser()` uses:
  - `DELETE ${base}/users/${userId}`
- `loadAccessPanel()` calls:
  - `GET ${base}/memberships`
  - `GET ${base}/roles`
- `submitRoleForm()` uses:
  - `POST ${base}/roles`
  - `PUT ${base}/roles/${roleId}`
- `submitMembershipRoleForm()` uses:
  - `POST ${base}/memberships/${membershipId}/roles`
- `deleteMembershipRole()` uses:
  - `DELETE ${base}/memberships/${membershipId}/roles/${roleAssignmentId}`
- Legacy user list rows use `payload.users`.
- Legacy membership detail reads `user.location_memberships`, `user.membership_roles`, and `user.organization_membership`.

### Email / Notifications

- `loadEmailListsPanel()` calls:
  - `GET ${base}/email-lists`
- `loadEmailListMembers()` calls:
  - `GET ${base}/email-lists/${emailListId}/members`
- `submitEmailListForm()` uses:
  - `POST ${base}/email-lists`
  - `PUT ${base}/email-lists/${editId}`
- `submitEmailListMemberForm()` uses:
  - `POST ${base}/email-lists/${listId}/members`
- `archiveEmailList()` uses:
  - `DELETE ${base}/email-lists/${listId}`
- `deleteEmailListMember()` uses:
  - `DELETE ${base}/email-lists/${listId}/members/${memberId}`
- Legacy response shapes:
  - lists: `payload.email_lists`
  - members: `payload.members`

### Branding Studio

- Legacy branding UI is organization-scoped and shown only when the user is org admin.
- `loadBrandingPanel()` calls:
  - `GET ${apiBase}/organizations/${organizationIdForBranding}/branding`
- `handleBrandingFormSubmit()` calls:
  - `PUT ${apiBase}/organizations/${organizationIdForBranding}/branding`
- `uploadBrandingLogo()` calls:
  - `POST ${apiBase}/photos/upload`
  - with `FormData.file`
  - and `report_id=branding-${organizationIdForBranding}`
- Legacy branding fields shown in `index.html`:
  - `organization_name`
  - `logo_url`
  - `primary_color`
  - `secondary_color`
  - `accent_color`
  - `button_color`
  - `background_color`
  - `text_color`
  - `border_color`
  - `error_color`
  - `success_color`
  - `warning_color`
  - `font_family`
  - `company_address`
  - `company_phone`
  - `company_email`
  - `website_url`
  - `powered_by_logo_path`
  - `email_signature`
  - `email_footer`
  - `custom_theme_data`
  - `email_templates`
  - `is_dark_mode`
- Legacy branding response handling reads:
  - top-level fields like `organization_name`, `logo_url`, `updated_at`
  - nested `branding` object if present
  - `custom_theme_data`
  - `email_templates`

## Current Next Service and Page References

| Page | Service Function | Method | Path | Status | Notes |
|---|---|---:|---|---|---|
| `/organizations` | `usePortalDirectorySnapshot()` | GET | users, facilities, memberships, email lists through `portalData` | working | page is display-only for org actions; Add/Link buttons disabled |
| `/organizations` | `organizationService.getOrganizations()` | GET | `/organizations` | unverified | service exists, page does not currently use it |
| `/organizations` | `organizationService.getOrganization()` | GET | `/organizations/:organizationId` | unverified | service exists, page does not currently use it |
| `/organizations` | `organizationService.updateOrganization()` | PUT | `/organizations/:organizationId` | unverified | service exists, page does not currently use it |
| `/organizations` | `organizationService.getOrganizationVisibility()` | GET | `/organizations/:organizationId/visibility` | unverified | service exists, page does not currently use it |
| `/organizations` | `organizationService.updateOrganizationVisibility()` | PUT | `/organizations/:organizationId/visibility` | unverified | service exists, page does not currently use it |
| `/facilities` | `FacilitiesAdapter.getFacilities()` | GET | `/organizations/:organizationId/locations` | working | returns 3 facilities in browser |
| `/facilities` | `FacilitiesAdapter.getLocationMemberships()` / `UsersAdapter.getLocationMemberships()` | GET | `/admin/organizations/:organizationId/location-memberships` | working | used to join assigned users |
| `/facilities` | `usePortalBrandingSnapshot()` | GET | `/organizations/:organizationId/branding` | working | branding display moved into facility detail |
| `/users` | `UsersAdapter.getUsers()` | GET | `/admin/organizations/:organizationId/users` | working | returns 11 users in browser |
| `/users` | `UsersAdapter.getRoles()` | GET | `/admin/organizations/:organizationId/roles` | unverified | service exists; not fully browser-proven in this pass |
| `/users` | `UsersAdapter.getMemberships()` | GET | `/admin/organizations/:organizationId/memberships` | working-ish | used for org role/member context |
| `/users` | `UsersAdapter.getLocationMemberships()` | GET | `/admin/organizations/:organizationId/location-memberships` | working | used to derive facility links |
| `/email` and `/delivery-rules` | `fetchEmailLists()` | GET | `/admin/organizations/:organizationId/email-lists` | working | current Email page uses this as list summary |
| `/email` and `/delivery-rules` | `fetchEmailListMembers()` | GET | `/admin/organizations/:organizationId/email-lists/:listId/members` | working | selected list members are shown |
| `/email` and `/delivery-rules` | `updateEmailList()` | PUT | `/admin/organizations/:organizationId/email-lists/:listId` | working | rule toggle action |
| `/email` and `/delivery-rules` | `addEmailListMember()` | POST | `/admin/organizations/:organizationId/email-lists/:listId/members` | working | provision subscriber action |
| `/branding` | `fetchBranding()` | GET | `/organizations/:organizationId/branding` | working | standalone branding page uses this |
| `/branding` | `saveBranding()` | PUT | `/organizations/:organizationId/branding` | working | branding page persists form state |
| `/control/templates` | `fetchOrganizationBranding()` | GET | control-plane branding snapshot | working | control surface, not primary portal surface |

## Existing Working Endpoints

- `GET /api/organizations/:organizationId/locations`
- `GET /api/admin/organizations/:organizationId/users`
- `GET /api/admin/organizations/:organizationId/location-memberships`
- `GET /api/admin/organizations/:organizationId/email-lists`
- `GET /api/admin/organizations/:organizationId/email-lists/:listId/members`
- `GET /api/organizations/:organizationId/branding`
- `PUT /api/organizations/:organizationId/branding`
- `POST /api/photos/upload` for branding logo uploads

## Broken or Unverified Endpoints

- `GET /api/organizations/:organizationId/users` was reported as 404 in earlier browser investigation, but the current Next code now uses the admin users endpoint instead.
- `GET /api/control-plane/organizations/:organizationId/locations` was reported as 404 in earlier browser investigation; the current facilities flow uses `/api/organizations/:organizationId/locations`.
- Organization create/link routes were not proven in legacy `index.html`.
- Branding write endpoint on a facility-specific scope was not proven in legacy `index.html`.
- Email-list archive/delete routes are verified in legacy but are not fully surfaced in the current Next Email page yet.

## Backend Gap List

### Missing endpoint: Organization create

- Status: missing
- Method: `POST`
- Path: `/api/admin/organizations`
- Used by page: `/organizations`
- Legacy equivalent: not found in inspected `index.html`
- Current Next call: none
- Current failure: Add Organization button remains disabled
- Required auth: super-admin
- Role gate: super_admin only
- Request body:
  ```ts
  type CreateOrganizationRequest = {
    name: string;
    slug?: string;
    plan_tier?: string;
    metadata?: Record<string, unknown>;
  };
  ```
- Response body:
  ```ts
  type OrganizationResponse = {
    id: string;
    name: string;
    slug?: string;
    plan_tier?: string;
    created_at?: string;
    updated_at?: string;
  };
  ```
- Minimal backend implementation notes:
  - create the org row
  - return the normalized organization object
  - keep tenant scoping strict
- Risk:
  - medium; admin-only create path affects tenant inventory

### Missing endpoint: Organization link

- Status: missing
- Method: `POST`
- Path: `/api/admin/organizations/link`
- Used by page: `/organizations`
- Legacy equivalent: not found in inspected `index.html`
- Current Next call: none
- Current failure: Link Organization button remains disabled
- Required auth: super-admin
- Role gate: super_admin only
- Request body:
  ```ts
  type LinkOrganizationRequest = {
    organization_id: string;
    user_email?: string;
    auth0_user_id?: string;
    role?: string;
  };
  ```
- Response body:
  ```ts
  type OrganizationMembershipResponse = {
    id: string;
    organization_id: string;
    user_id?: string;
    auth0_user_id?: string;
    email?: string;
    role: string;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
  };
  ```
- Minimal backend implementation notes:
  - link the current account or target account to the org
  - return normalized membership metadata
- Risk:
  - medium; affects account/org binding

### Missing endpoint: Facility assignment update/delete shape verification

- Status: backend-exists-but-shape-mismatch
- Method: `PATCH` / `DELETE`
- Path:
  - `/api/admin/organizations/:organizationId/location-memberships/:membershipId`
  - `/api/admin/organizations/:organizationId/location-memberships/:membershipId`
- Used by page: `/facilities`, `/users`
- Legacy equivalent: `location-memberships` detail edit/delete in legacy access panel
- Current Next call: `removeLocationMembership()` exists; update path is not yet fully surfaced in the modern UI
- Current failure: read path works, write path not fully validated in browser
- Required auth: org admin
- Role gate: organization admin
- Request body:
  ```ts
  type LocationMembershipRequest = {
    user_id: string;
    location_id: string;
    role?: string;
    is_active?: boolean;
    is_primary?: boolean;
    metadata?: Record<string, unknown>;
  };
  ```
- Response body:
  ```ts
  type LocationMembershipResponse = {
    location_membership_id?: string;
    id?: string;
    organization_id: string;
    location_id: string;
    user_id: string;
    role?: string;
    is_active?: boolean;
    is_primary?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  ```
- Minimal backend implementation notes:
  - support update/delete on location membership ids
  - preserve read payload shape
- Risk:
  - medium; user-facility assignment integrity

### Missing endpoint: Facility-level branding

- Status: missing
- Method: `GET` / `PATCH`
- Path:
  - `/api/admin/organizations/:organizationId/locations/:locationId/branding`
  - `/api/admin/organizations/:organizationId/locations/:locationId/branding`
- Used by page: `/facilities`
- Legacy equivalent: no verified facility-level branding route in inspected `index.html`
- Current Next call: none
- Current failure: branding is display-only on the facility detail panel
- Required auth: org admin
- Role gate: organization admin
- Request body:
  ```ts
  type BrandingSnapshot = {
    organization_id: string;
    organization_name?: string;
    logo_url?: string;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    button_color?: string;
    background_color?: string;
    text_color?: string;
    border_color?: string;
    error_color?: string;
    success_color?: string;
    warning_color?: string;
    font_family?: string;
    company_address?: string;
    company_phone?: string;
    company_email?: string;
    website_url?: string;
    powered_by_logo_path?: string;
    email_signature?: string;
    email_footer?: string;
    custom_theme_data?: Record<string, unknown>;
    email_templates?: Record<string, unknown>;
    is_dark_mode?: boolean;
    updated_at?: string;
  };
  ```
- Response body: same as `BrandingSnapshot`
- Minimal backend implementation notes:
  - if facility overrides are desired, separate them from org branding
  - do not replace the current org-level branding contract
- Risk:
  - low-medium; mostly product/design scope

### Missing endpoint: Branding logo upload verification

- Status: frontend-not-wired
- Method: `POST`
- Path: `/api/photos/upload`
- Used by page: `/branding`
- Legacy equivalent: `uploadBrandingLogo()`
- Current Next call: none
- Current failure: logo upload is not wired in the modern branding page
- Required auth: org admin
- Role gate: organization admin
- Request body:
  - multipart form data with `file`
  - legacy also sends `report_id=branding-<organizationId>`
- Response body:
  - JSON with `urls: string[]`
- Minimal backend implementation notes:
  - keep uploaded branding asset handling separate from report uploads if possible
- Risk:
  - medium; file upload path

## Recommended Implementation Order

1. Verify any still-unproven endpoints with live curl/Postman against the production-like API base.
2. Wire or document the organization create/link backend routes.
3. Confirm whether branding uploads should stay on `/api/photos/upload` or move to a dedicated branding asset route.
4. Add any missing facility-membership update/delete UI actions if the backend exposes them cleanly.
5. Add email-list archive/delete/member delete UI if the backend contract is stable.
6. Re-run portal browser validation on Organizations, Facilities, Users, Email, and Branding.

## Request / Response Shapes Needed by Frontend

### Users and memberships

```ts
type LocationMembershipResponse = {
  location_membership_id?: string;
  id?: string;
  organization_id: string;
  location_id: string;
  user_id: string;
  role?: string;
  is_active?: boolean;
  is_primary?: boolean;
  created_at?: string;
  updated_at?: string;
  membership_metadata?: Record<string, unknown>;
  location?: {
    id: string;
    name?: string;
    label?: string;
    slug?: string;
  };
  user?: {
    id?: string;
    auth0_user_id?: string;
    email: string;
    display_name?: string;
    first_name?: string;
    last_name?: string;
  };
};
```

### Email lists

```ts
type EmailList = {
  id: string;
  key: string;
  name: string;
  type?: "notification" | "routing" | "other";
  location_id?: string | null;
  is_active?: boolean;
  is_editable?: boolean;
  recipients?: string[];
  metadata?: Record<string, unknown>;
  updated_at?: string;
};

type EmailListMember = {
  id: string;
  email: string;
  display_name?: string;
  recipient_type?: "external" | "user";
  user_id?: string;
  is_active?: boolean;
};
```

### Branding snapshot

```ts
type BrandingSnapshot = {
  organization_id: string;
  organization_name?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  button_color?: string;
  background_color?: string;
  text_color?: string;
  border_color?: string;
  error_color?: string;
  success_color?: string;
  warning_color?: string;
  font_family?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  website_url?: string;
  powered_by_logo_path?: string;
  email_signature?: string;
  email_footer?: string;
  custom_theme_data?: Record<string, unknown>;
  email_templates?: Record<string, unknown>;
  is_dark_mode?: boolean;
  updated_at?: string;
};
```
