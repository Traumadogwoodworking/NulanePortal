### 1. Control Plane source found
**Yes:** The `grep` and file inspection revealed that `src/lib/controlRoutes.ts` incorrectly included `/facilities` and `/users` in the `controlRoutes` array. The `AppShellRouter` component was then using `isControlRoute` to wrap these pages in the `ControlWorkspaceShell`, causing the Control Plane block to appear.

### 2. Control Plane removed from Facilities: yes/no
**Yes:** The `/facilities` route definition was removed from the `controlRoutes` array in `src/lib/controlRoutes.ts`.

### 3. Control Plane removed from Users: yes/no
**Yes:** The `/users` and `/users/access` route definitions were removed from the `controlRoutes` array in `src/lib/controlRoutes.ts`.

### 4. Organizations standalone status
**PASS:** The page remains a clean, standalone summary of the current session's organization.

### 5. Support standalone status
**PASS:** The page remains a standalone support center.

### 6. Role/session fields found
- **`isSuperAdmin` (boolean):** User has the highest level of access.
- **`isAdmin` (boolean):** User has access to all portal features, but not tenant management.
- **`isOrgAdmin` (boolean):** User can manage organization-level settings.
- **`permissions` (string[]):** A list of specific permission keys.
- **`organization` (object):** Contains the current organization's details.
- **`locations` (array):** An array of facility-like objects the user has access to.

### 7. Role helper/mapping changes made
- Created `src/lib/roles.ts` to define role constants (`ROLE_SUPER_ADMIN`, `ROLE_ADMIN`, `ROLE_ORG_ADMIN`, etc.) and provide simple helper functions (`isSuperAdmin`, `isOrgAdmin`, `isAdmin`).
- Added comments to `src/lib/portalSession.tsx` to clarify the existing role-derivation logic and imported the new role constants.

### 8. Remaining backend/session role contract needed
- An explicit `facility_admin` role or a similar mechanism is needed in the session to distinguish users who can manage specific facilities from organization-level admins.
- The session should ideally provide a clear list of `organization_ids` and `facility_ids` that the user has administrative scope over to enable more granular access control on the frontend.

### 9. Black/dark white-theme blocks removed
**Yes:** The removal of the `ControlWorkspaceShell` from the `/facilities` and `/users` pages also removed the dark-themed Control Plane header from those pages, ensuring they now fully adhere to the white-theme aesthetic.

### 10. Files changed
- `src/lib/controlRoutes.ts`
- `src/lib/roles.ts` (created)
- `src/lib/portalSession.tsx`

### 11. Lint result
**PASS:** `npm run lint -- --quiet` completes with 0 errors.

### 12. Build result
**FAIL:** The build fails due to the pre-existing and unrelated type error in `src/app/control/operations/page.tsx` concerning `ledecAlertRecipients`. This is the expected outcome.

### 13. Remaining blocker
The sole build blocker is the type error in `src/app/control/operations/page.tsx`.

### 14. Next recommended pass
DocuDent + DocuFit black-block cleanup and workflow visual parity.
