# Settings Work Inventory

Scope: `/settings` and the Settings-related surfaces already present in the portal.

## Current State

- `/settings` is a light-theme session/workspace summary page.
- It currently shows:
  - user and role
  - organization and organization ID
  - branding configuration presence
  - dashboard embed presence
  - support form configuration presence
  - enabled module toggles
  - environment and API base

## Useful Follow-Up Work

1. Add a settings navigation entry that is clearly scoped to workspace/session values.
2. Split read-only configuration from any future editable preferences.
3. Add backend-backed organization/session preference panels only after a verified route exists.
4. Add audit/history views only if the backend exposes a stable settings audit route already in use elsewhere.
5. Keep branding editing in the branding/facility surfaces, not inside `/settings`.

## Not Started

- No settings mutation editor.
- No dependency on `/report/pull`.
- No backend/database changes in this pass.

## Recommended Next Step

- Verify whether there is a real backend settings write route before adding any controls.
