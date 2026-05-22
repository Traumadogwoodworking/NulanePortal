### 1. Support page cleanup
- The "Ticket Backend not configured" card has been removed from `/support`.
- The support page now only shows the main support/contact card, the escalation card, and the technical details card.

### 2. Nulane footer logo fix
- `src/components/PortalSidebar.tsx` was inspected.
- It was confirmed that the `-inv` logo asset is not used for the white sidebar.
- The visible “Powered by Nulane” logo asset is used.

### 3. Add Settings page/nav
- `src/app/settings/page.tsx` was rewritten to be a clean, white, simple settings page.
- The settings page now shows session summary and environment information.
- A link to the settings page was added to the sidebar under the "Support" section.

### 4. Confirm control route fix
- `src/lib/controlRoutes.ts` was inspected and it was confirmed that `/users`, `/users/access`, and `/facilities` are not in the `controlRoutes` array.

### 5. Ticket backend plan
- A `TICKET_BACKEND_PLAN.md` file was created with the recommended backend contract for a support ticket system.

### 6. Files changed
- `src/app/support/page.tsx`
- `src/app/settings/page.tsx`
- `src/lib/navigation.ts`
- `src/components/PortalSidebar.tsx`
- `TICKET_BACKEND_PLAN.md` (created)

### 7. Lint result
**PASS:** `npm run lint -- --quiet` completes with 0 errors.

### 8. Build result
**FAIL:** The build fails due to the pre-existing and unrelated type error in `src/app/control/operations/page.tsx` concerning `ledecAlertRecipients`. This is the expected outcome.

### 9. Next pass: DocuDent + DocuFit white-theme workflow cleanup
