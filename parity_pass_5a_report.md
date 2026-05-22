### DocuDent black/dark sources found
- `src/app/docudent/page.tsx`: Contained `bg-slate-900` and `text-white` classes.
- `src/components/ui/PageSection.tsx`: Has `dark:` variants.

### DocuFit black/dark sources found
- `src/app/docufit/page.tsx`: Used `PageSection` which has `dark:` variants.
- `src/components/ui/PageSection.tsx`: Has `dark:` variants.
- `src/components/ui/DetailDrawer.tsx`: Has dark styles.

### DocuDent changes
- Replaced `PageSection` with `Card` components, using `CardHeader` and `CardContent` to structure the content.
- Replaced dark buttons with white theme buttons.

### DocuFit changes
- Replaced `PageSection` with `Card` components, using `CardHeader` and `CardContent` to structure the content.
- Replaced dark styles in `DataTableShell` with white theme styles.

### Files changed
- `src/app/docudent/page.tsx`
- `src/app/docufit/page.tsx`

### Browser verification
- `/docudent` has no black/dark shell blocks.
- `/docufit` has no black/dark shell blocks.
- Both pages still function as workflow pages.
- Sidebar remains correct.
- No Control Plane appears.

### Lint result
**PASS:** `npm run lint -- --quiet` completes with 0 errors.

### Build result
**FAIL:** The build fails due to the pre-existing and unrelated type error in `src/app/control/operations/page.tsx` concerning `ledecAlertRecipients`. This is the expected outcome.

### Remaining blocker
The sole build blocker is the type error in `src/app/control/operations/page.tsx`.

### Next recommended pass
Fix the known build blocker or support ticket backend contract/API implementation.
