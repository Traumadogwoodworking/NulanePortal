# INS-001 Work Control Update

## Task

- `INS-001` — Prepare and validate SHAP Inspection Trac field cutover
- Owner: Matthew Snider
- Priority: P0
- State: working
- Due: July 29, 2026 field window

## QA

Twenty QA items exist in Work Control. All begin `not_started` except local automated evidence is attached to large-submission durability/recovery items without marking them passed.

## Today

The July 29 plan covers arrival/inventory, users/builds, normal workflow, large submission, backend/PDF/portal/VICS verification, MDM persistence, and exit/sign-off.

## Needs Review

Only decisions requiring Matthew are represented:

1. Approve the exact clean mobile candidate and rollback artifact.
2. Provide/approve the Stellantis VICS contract, safe test route, endpoint/credentials, SHAP identifiers, report-class scope, acknowledgement semantics, and external owner.
3. Provide live Hexnode tenant/device/policy access and authorize any reset-gated fully managed enrollment action.

## Release candidate

`SHAP-RC-2026-07-29` is draft and unapproved. Physical-device, VICS, and MDM fields remain UNKNOWN.

## Remaining unknowns

See `CURRENT_STATE_PREFLIGHT.md`, `RELEASE_CANDIDATE.md`, and the open QA blockers. No unknown was converted to a pass.
