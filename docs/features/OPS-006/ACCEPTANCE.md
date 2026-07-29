# OPS-006 Acceptance Criteria

- [x] Today uses one Detroit-local operational-date predicate for counts and filters.
- [x] P0, due-today, blocked, approval, missing-evidence, completed-today, and INS-001 are rendered from PostgreSQL-backed API data.
- [x] Terminal tasks are read-only and guarded against accidental active-state transitions.
- [x] Refresh rejects malformed payloads and prevents an older response from replacing a newer one.
- [x] Submitted QA and task-verification proof is visible without disclosure clicks, with source, time, classification, and task links.
- [x] The physical-device gate is summarized once and detailed unknowns remain visible lower on the page.
- [x] Existing routes contain no chart implementation; no unsupported chart or parallel planner was introduced.
- [x] Tests, type-check, lint, production build, managed restart, APIs, browser console, active navigation, evidence ordering, and Today due filter passed.
- [x] Device testing and production deployment remain excluded.

## acceptance criteria

Today renders real current data and correctly exposes P0, due-today, blocked, awaiting approval, missing evidence, completed today, and INS-001; filters and task links work; every useful chart renders correct data plus empty and error states; console and server logs are clean; layout does not hide or overflow rows; refresh preserves useful state; and managed Docker restart recovery works.

## definition of done

Done means every reported Today and chart regression is reproduced, root-caused, fixed, tested, live-verified on the canonical local runner, committed and pushed; the Inspection Trac operations page remains useful; no parallel planning system is added; Work Control and Work Thoughts are synchronized; and device-dependent Inspection-Trac readiness remains BLOCKED.

Implementation and local verification are complete. Git push and Work Thoughts synchronization remain the final release steps.
