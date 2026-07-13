# Portal filter verification

Verified on 2026-07-12/13 in the isolated portal and API worktrees. This record
separates completed code verification from manual/live acceptance.

## Completed portal checks

- Focused Vitest: 13 files, 68 tests passed.
- TypeScript: `npx tsc --noEmit` passed.
- Focused ESLint: passed with no errors or warnings.
- Production build: `npm run build` passed; 47 static routes generated.
- Query tests cover empty/all fields, stable serialization, leading-zero `04`,
  special characters, reset, URL round trip, omission, and page restrictions.
- Facet tests cover schema validation, normalization, deduplication, canonical
  IDs, authorization-scoped keys, and rejection of unsupported copied values.
- Report tests cover yard ID/label aliases, later damage entries, canonical
  damage codes, filter parameter preservation, pagination, deduplication, and
  the explicit 100-page export safety cap.
- Request tests cover timeouts, aborts, finite retry classification, request
  diagnostics, and terminal authorization/validation/schema failures.
- No authentication files were modified.

The development portal is served from the isolated worktree on the required
CORS origin:

```text
http://localhost:3000/home/
```

Reports are available at `http://localhost:3000/reports/`.

## Completed backend code checks

The isolated API branch contains two commits:

- `df1ba98 Fix report filters and expose authorized facets`
- `0e4476e Fix dashboard analytics filter semantics`

Focused API route/service tests, lint, and controlled PostgreSQL query proofs
passed. The changes add the authorized facet endpoint and correct existing
report-list/dashboard filter semantics. They do not change authentication or
database schema.

## Manual/live acceptance still required

The backend commits have not been deployed. Therefore the running portal cannot
yet prove the new facet endpoint or every filter against production-authorized
real data. The following remain deliberately unclaimed:

- real-data yard/facility/inspection/inspector/status/make/model/damage/date
  acceptance;
- combined-filter and reset acceptance against the deployed API;
- browser back/forward and refresh behavior under a real signed-in session;
- visual before/after approval and click-target review;
- production route, service, image, or deployment verification.

Per the requested workflow, visual and browser acceptance is assigned to human
QA at the URLs above. No Playwright run or automated screenshot review was used
as a substitute for that review.

The portal acceptance gate remains open until the API changes are available to
the portal and human QA confirms the listed behavior. Workspace/GitLab
organization and production deployment work must not proceed through that gate.
