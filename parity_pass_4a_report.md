### 1. Real org/facility/user/support data sources found
- **Organizations:** Only the current session organization is available from `usePortalSession`. There is no API for listing all organizations.
- **Facilities:** `usePortalDirectorySnapshot` provides a list of all facilities for the current organization via `FacilitiesAdapter.getFacilities`.
- **Users:** `usePortalDirectorySnapshot` provides a list of all users for the current organization via `UsersAdapter.getUsers`.
- **Support:** `portalConfig.supportFormUrl` provides a URL for a support form. There is no ticket backend.

### 2. Organizations changes
- The page is now a polished "Current Organization" page.
- It displays the organization name, ID, and the user's role.
- It shows the number of users and facilities in the organization.
- It includes a card explaining that a backend for listing all organizations is not configured.

### 3. Facilities changes
- The details panel now shows the selected facility's name, ID, region, and status.
- It also lists the users assigned to the selected facility, with links to their user pages.

### 4. Users changes
- The details panel now shows the selected user's name, email, role, and status.
- It provides an explanation of the user's role.
- It lists the facilities the user has access to.
- It shows the organization scope.
- The page now correctly handles the `userId` query parameter.

### 5. Support Tickets changes
- The page is now a completed standalone "Support Tickets" page.
- It includes a primary card for contacting support, with a link to the `supportFormUrl` if it exists.
- It has a card that clearly states "Ticket backend not configured".
- It includes a card with escalation instructions.
- Technical details like API base and environment are in a separate, less prominent card.

### 6. Role semantics kept/updated/reverted
- The role semantics from the previous pass were kept.
- `src/lib/roles.ts` is used and remains.
- The changes in `portalSession.tsx` were kept.

### 7. Files changed
- `src/app/organizations/page.tsx`
- `src/app/facilities/page.tsx`
- `src/app/users/page.tsx`
- `src/app/support/page.tsx`

### 8. Browser verification results
- `/organizations` is useful and no longer feels like a dead unconfigured module.
- `/facilities` has no Control Plane block and details panel is useful.
- `/users` has no Control Plane block and details panel is useful.
- `/support` is standalone and completed.
- No black blocks on these four pages.
- Sidebar remains correct.

### 9. Lint result
**PASS:** `npm run lint -- --quiet` completes with 0 errors.

### 10. Build result
**FAIL:** The build fails due to the pre-existing and unrelated type error in `src/app/control/operations/page.tsx` concerning `ledecAlertRecipients`. This is the expected outcome.

### 11. Remaining blocker
The sole build blocker is the type error in `src/app/control/operations/page.tsx`.

### 12. Next pass: DocuDent + DocuFit white-theme workflow cleanup
