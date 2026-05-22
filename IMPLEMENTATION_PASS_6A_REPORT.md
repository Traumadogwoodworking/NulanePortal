### 1. Users completed with existing fields: yes/no
**Yes:** The selected user panel now shows more details, including `createdAt`, `updatedAt`, and a note about the missing `lastLogin`.

### 2. Facilities assigned-user derivation result
**PASS:** The selected facility panel now correctly derives and displays the assigned users.

### 3. Organizations improved: yes/no
**Yes:** The page now shows more details about the current organization, including plan tier, enabled modules, and branding status.

### 4. Settings improved: yes/no
**Yes:** The page is now more useful, showing a session summary, workspace settings, and enabled modules.

### 5. Support improved: yes/no
**Yes:** The page is now more useful, with a "What to include" checklist and a neutral message if the support form is not configured.

### 6. Top-right controls removed: yes/no
**Yes:** The Brand/Dark/Light controls in the top bar have been removed.

### 7. All Facilities selector fixed: yes/no
**Yes:** The black "All Facilities" selector has been fixed and now has a white theme.

### 8. Files changed
- `src/app/users/page.tsx`
- `src/app/facilities/page.tsx`
- `src/app/organizations/page.tsx`
- `src/app/settings/page.tsx`
- `src/app/support/page.tsx`
- `src/components/PortalTopBar.tsx`
- `src/components/ui/FacilitySelector.tsx`
- `src/lib/types.ts`
- `src/lib/services/usersService.ts`

### 9. Lint result
**PASS:** `npm run lint -- --quiet` completes with 0 errors.

### 10. Build result
**FAIL:** The build fails due to the pre-existing and unrelated type error in `src/app/control/operations/page.tsx` concerning `ledecAlertRecipients`. This is the expected outcome.

### 11. Remaining backend gaps
- A backend for managing organizations, facilities, and users (CRUD operations).
- A backend for the support ticket system.
- The `last_login` field for users.
- `created_at` and `updated_at` timestamps for facilities.

### 12. Next smallest fix
Fix the known build blocker in `src/app/control/operations/page.tsx`.
