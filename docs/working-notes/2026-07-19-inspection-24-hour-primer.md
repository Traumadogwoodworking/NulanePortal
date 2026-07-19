# Inspection Trac 24-hour portal WIP primer

## Resume objective

Finish publishing the verified Inspection Trac `/inspection/24-hour` portal update through the self-hosted GitLab pipeline to the linked Vercel project. Do not publish directly from a workstation.

## Repositories and branches

Portal:

- Path: `/Users/home/Desktop/Codex/websites/dev/vercel-portal-exact`
- Branch: `cicd/vercel-dev-cors`
- GitLab project: `nulane/inspection-trac-portal`
- GitLab remote: `ssh://git@localhost:2424/nulane/inspection-trac-portal.git`
- Vercel project: `inspection-trac-portal-dev`
- Vercel project ID: `prj_BSarJ0dL2TCvoKRSbTJnuiWCqnYX`
- Vercel team ID: `team_CczJOjtPJm7x5HiMADhsAkYb`

Backend source snapshot:

- Path: `/Users/home/Desktop/Codex/apis/inspection-trac-api-cicd`
- Branch: `ci/staging-inspection-trac-setup`
- Local WIP commit: `110c9b6d75ea9ed10f28cfc4ac2ec6c8dc6eb4c8`

## Runtime source of truth

- Rail API base: `https://api.nulanesystems.com/inspection-trac/api`
- Portal endpoint: `GET /inspection/24-hour/portal-display`
- Health endpoint: `https://api.nulanesystems.com/inspection-trac/api/health`
- The 24-hour page must use the rail backend through the shared authenticated `apiFetch` path.
- Do not restore the removed page-only localhost/development API block.
- Do not use mock, fallback, staging-copy, or generic DocuDent data.

## Implemented portal behavior

- One canonical dataset contains inspected and uninspected rows.
- Search covers VIN and the explicit stable identifiers and location fields.
- Filters cover All, Uninspected, Inspected, Normal, Due soon, Critical, Overdue, and yard/facility values.
- The search/filter toolbar is sticky at the top of the table scrolling container.
- The column header row is sticky below the toolbar with separate offsets and z-index.
- Repeated `SHAP/SHAP/` location prefixes are removed for display.
- `Overdue` is rendered black with white accessible text.
- Loading, error, empty, retry, stale request, and development diagnostics are explicit.
- Requests use cancellation, a 15-second timeout, correlation IDs, HTTP validation, and defensive response validation.

## Canonical status boundaries

- `0 <= age < 12h`: `normal`
- `12h <= age < 16h`: `due_12h`
- `16h <= age < 24h`: `critical`
- `age >= 24h`: `overdue`
- Inspected rows: `inspected`, with uninspected countdown and overdue values set to zero
- Exactly 24 hours is Overdue.

## Backend contract

The portal requires:

- `ok: true`
- `inspection_type: "24_hour"`
- Canonical `generated_at` and `current_server_time` timestamps with timezone offsets
- A completed snapshot with `id`, `status: "completed"`, `capture_time`, and `completed_at`
- Stable `id` / `inventory_row_id` and matching `snapshot_id` on every row
- Canonical row timestamps and non-negative age/countdown/overdue seconds
- Severities limited to `normal`, `due_12h`, `critical`, `overdue`, and `inspected`

The backend converts a successfully processed mailbox import into the canonical completed snapshot. Rows absent from the latest completed snapshot are not returned.

## Verification already completed

Portal:

- GitLab YAML parsing passed.
- TypeScript passed.
- ESLint passed with 38 pre-existing warnings and zero errors.
- Full Vitest run passed: 28 files, 95 tests.
- Next.js production build passed and generated `/inspection/24-hour`.
- `git diff --check` passed.
- Local `/inspection/24-hour/` returned HTTP 200.

Backend source snapshot:

- Focused portal-state, route, smoke-auth, and mailbox-inventory tests passed.
- Syntax/lint checks passed.
- `git diff --check` passed before the WIP commit.

Runtime evidence supplied with the backend deployment transcript:

- The production rail API process was restarted successfully.
- Public health returned HTTP 200.
- The live 515-row mailbox snapshot passed the canonical contract.
- Reported buckets were 462 Overdue, 52 Critical, and 1 Due soon.
- The user subsequently confirmed the page was working.

No browser-control session was available, so interactive browser inspection was not independently repeated during the publishing setup.

## GitLab to Vercel publishing setup

`.gitlab-ci.yml` now:

- Removes the GitHub Pages publishing job.
- Runs lint, typecheck, and unit tests before building.
- Pulls the linked Vercel production configuration.
- Builds a Vercel prebuilt artifact without the development-session bypass.
- Deploys production only from the GitLab default branch or `cicd/vercel-dev-cors`.
- Serializes production publishes with a resource group.
- Inspects the deployment and probes `/inspection/24-hour/`.

The Vercel project has no connected Git repository, so Vercel cannot independently auto-publish from GitHub or another Git provider.

## Current blocker

GitLab needs a durable masked and protected CI variable named `VERCEL_TOKEN`.

The local Vercel CLI is authenticated through a short-lived OAuth session. `vercel tokens add` returned HTTP 403 (`Cannot create tokens for this app`), so that session must not be copied into GitLab. No Vercel token was stored in GitLab.

User action:

1. Create a project-scoped token for `inspection-trac-portal-dev` at `https://vercel.com/account/tokens`.
2. Add it to `http://localhost:8929/nulane/inspection-trac-portal/-/settings/ci_cd` as `VERCEL_TOKEN` with Masked and Protected enabled.
3. Reply `done`.

## Resume sequence

1. Confirm `VERCEL_TOKEN` exists in GitLab without printing its value.
2. Confirm the portal WIP commit and unrelated dirty files remain separated.
3. Push the reviewed portal WIP commit to GitLab. Prefer fast-forwarding the protected `main` branch for the production pipeline; do not force-push.
4. Monitor every GitLab job through completion.
5. Confirm the Vercel deployment reaches Ready.
6. Probe the deployed `/inspection/24-hour/` route and confirm the alias points to the new deployment.
7. Report the Git commit, pipeline, deployment URL, alias, and remaining browser-verification limitation.

## Preservation boundary

The portal worktree contained unrelated pre-existing edits before this task. They must remain unstaged and uncommitted. Do not reset, stash, clean, revert, or overwrite them. Check `git status --short` before every commit or push.
