# OPS-006 Verification

Record commands, test results, device/API/deployment evidence, remaining risks, and rollback source.

## verification

Required evidence is before/after screenshots, browser console and failed-request inspection on all primary and chart routes, response-schema samples, focused tests reproducing each defect, type-check, lint, test suite, git diff check, live local API/page smoke, America/Detroit boundary tests, narrow viewport and keyboard checks, nulane-dev logs, and managed restart recovery.

## 2026-07-29 local postflight

Result classification: VERIFIED FACT for the local Work Control repair. Inspection-Trac field readiness remains BLOCKED and NO-GO because this task does not supply physical-device, installed-build, production-backend, or portal-correlation evidence.

- `npm test`: PASS, 18 tests including Detroit midnight/DST boundaries, count/filter parity, malformed payload rejection, stale-request ordering, terminal transition guards, evidence deduplication, and evidence-first rendering.
- `npm run type-check`: PASS.
- `npm run lint`: PASS with no findings.
- `npm run build`: PASS on Next.js 16.2.12; all Work Control routes built.
- `git diff --check`: PASS.
- `nulane-dev restart nulane-work-control`: PASS; only the registered matching runner was restarted and returned Ready with zero restarts.
- `GET /api/health`: HTTP 200, database Ready.
- `GET /api/overview`: eight PostgreSQL-backed tasks; status counts include the active INS-001 workflow.
- `GET /api/inspection-trac`: overall BLOCKED, three QA evidence records, four normalized task-verification records.
- Browser: Inspection Trac is the active navigation item; `Updated now` renders without the prior grammar defect; seven durable proof records are visible before the physical-device gate; console error count is zero.
- Browser: Today is the active navigation item; P0=4, Due today=1, Blocked=2, Awaiting approval=0, Missing evidence=5, Completed today=1; the due filter returns only INS-001.
- After screenshot: `/Users/home/Desktop/Codex/artifacts/work-control/OPS-006/after/inspection-trac-evidence-first-final.jpg`.
- Before screenshots: `/Users/home/Desktop/Codex/artifacts/work-control/OPS-006/before/today.jpg` and `/Users/home/Desktop/Codex/artifacts/work-control/OPS-006/before/inspection-trac.jpg`.
- Bounded runner logs: build, schema initialization, seed, startup, and service monitor are clean after the repair restart.

Rollback source is starting commit `a5ca365`. Revert only the OPS-006 repair commit and restart `nulane-work-control` through `nulane-dev`; PostgreSQL data is not rolled back.
