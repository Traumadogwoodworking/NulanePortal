# Portal filter/data repair: verified starting state

Verified on 2026-07-12 in America/Detroit before changing portal source.

## Scope and safety decision

The requested starting checkout is the regular primary checkout at
`/Users/home/Desktop/Codex/websites/vercel-portal-exact`. It is not itself a
linked worktree: both `git rev-parse --git-dir` and
`git rev-parse --git-common-dir` resolve to `.git`.

That checkout is materially dirty, so no repair work is being performed in it.
The clean implementation worktree is:

- path: `/private/tmp/vercel-portal-filter-data-contract`
- branch: `feature/portal-filter-data-contract-20260712`
- starting commit: `8c4e82d074e8bd7b5ca5e7132a1f655daec81fae`

Authentication is explicitly outside this repair. Auth0 configuration,
callbacks, portal session storage, login/logout redirects, and the working
authentication flow are protected and will not be changed unless a new test
failure directly proves that this portal work caused an authentication defect.

## Verified repository and runtime facts

| Item | Verified value |
| --- | --- |
| Requested checkout | `/Users/home/Desktop/Codex/websites/vercel-portal-exact` |
| Original branch | `snapshot/portal-static-deploy-20260711` |
| Original/current committed source | `8c4e82d074e8bd7b5ca5e7132a1f655daec81fae` (`Fix portal validation and static deployment blockers`) |
| Original worktree state | 52 tracked paths changed and 1,386 untracked paths; no staged changes; committed portal source/config paths under `src`, `package.json`, `next.config.mjs`, and `.gitlab-ci.yml` had no tracked diff |
| Checkout classification | Regular primary checkout, modified copy, on a source snapshot/static-deploy branch; not an isolated linked worktree |
| Node | `v26.3.0` |
| npm | `11.16.0` |
| Package manager evidence | `package-lock.json`, lockfile version 3; no `packageManager` field is declared |
| Next.js | declared `^16.2.10`; running dev process reports `v16.2.10` |
| Build | `npm run build` -> `next build` |
| Export | `next.config.mjs` sets `output: "export"`; `npm run export:validate` validates `out/` |
| GitHub Pages switch | `GITHUB_PAGES=true` sets `/inspection-trac` as both `basePath` and `assetPrefix`; otherwise the export is root-relative |
| Local serve command | `npm start` -> `npx serve@latest out` |
| Initial running dev process | PID 58380, `next-server (v16.2.10)`, initially listening on TCP 3000 |
| Initial running process cwd | `/Users/home/Desktop/Codex/websites/dev/vercel-portal-exact` (a different checkout, not this worktree) |

The user subsequently stopped that server and directed this repair to use port
3000 because the backend CORS policy requires that local origin. Port 3000 was
then verified free. Later browser verification will start this feature worktree
on `localhost:3000`; CORS and authentication configuration will not be changed.

## Remotes and worktrees

The verified remotes are:

| Remote | URL | Role observed from local refs |
| --- | --- | --- |
| `origin` | `git@github.com:Traumadogwoodworking/NulanePortal.git` | portal source |
| `target` | `https://github.com/Traumadogwoodworking/NulanePortal.git` | alternate portal source transport |
| `github` | `https://github.com/Traumadogwoodworking/NulaneSystems.git` | broader GitHub source |
| `inspection-trac-pages` | `git@github.com:Traumadogwoodworking/inspection-trac.git` | published static portal |
| `local-gitlab` | `ssh://git@localhost:2424/nulane/inspection-trac-portal.git` | local GitLab portal project |

Linked worktrees after creating the required isolated feature worktree:

| Path | Branch | Commit |
| --- | --- | --- |
| `/private/tmp/inspection-trac-pages-publish` | `publish-verified-20260711` | `3a77f34` |
| `/Users/home/Desktop/Codex/websites/vercel-portal-exact-gitlab-ci` | `cicd/gitlab-vercel` | `4e5b144` |
| `/private/tmp/vercel-portal-filter-data-contract` | `feature/portal-filter-data-contract-20260712` | `8c4e82d` |

## Recent source history

The recent source commits at the starting point are:

| Commit | Date/time | Subject |
| --- | --- | --- |
| `8c4e82d` | 2026-07-11 21:26 EDT | Fix portal validation and static deployment blockers |
| `c912f06` | 2026-07-11 21:20 EDT | Merge branch `cicd/gitlab-vercel` into snapshot branch |
| `85bc7f7` | 2026-07-11 21:20 EDT | Snapshot current Inspection Trac portal source |
| `4e5b144` | 2026-07-11 21:12 EDT | Publish verified static portal output through GitHub Pages |
| `ef1bcf7` | 2026-07-11 20:04 EDT | Add GitLab portal validation and Vercel deployment pipeline |
| `389967d` | 2026-07-06 18:21 EDT | Add analytics runtime data catalog page |

## Published and visual baselines

Two distinct baselines matter and must not be conflated:

1. **Last locally verified published artifact.** The local tracking ref
   `inspection-trac-pages/gh-pages` is at `9a79852` with subject
   `Publish portal 8c4e82d074e8bd7b5ca5e7132a1f655daec81fae`. This establishes
   `8c4e82d` as the source identity recorded by the most recent locally known
   static publication. A read-only remote check confirmed that same
   `9a79852` Pages head, and the public static asset responded successfully.
   No publication or production deployment was performed during this phase.
2. **Last known visually correct home implementation.** Prior parity recovery
   identified the legacy `/home` implementation around `5a4be16`. Comparing
   `5a4be16:src/app/home/page.tsx` with
   `85bc7f7:src/features/home-analytics/HomeDashboard.tsx` produces only a
   one-line source difference. The current committed `HomeDashboard` therefore
   retains that recovered legacy layout as the visual/interaction baseline.

The existing fixture-based Playwright protection is in
`e2e/home-dashboard.spec.ts` and `e2e/fixtures/home-dashboard-fixture.ts`.
It must be executed and its screenshot reviewed before portal acceptance; its
mere presence is not proof.

The ignored `out/` directory in the dirty original checkout does not match the
published Pages tree and is therefore treated as stale local output, not a
visual baseline.

## Preservation artifacts

The original checkout was preserved at:

`/private/tmp/vercel-portal-exact-preservation-20260712-224726`

Contents:

| Artifact | Purpose |
| --- | --- |
| `worktree.patch` | binary-capable unstaged tracked diff (102,732 bytes) |
| `index.patch` | staged diff (empty, confirming no staged changes) |
| `untracked-files.txt` | manifest of all 1,386 untracked paths; file contents were not copied |
| `untracked-top-level.txt` | compact untracked-path summary |
| `starting-state.txt` | branch, commit, counts, and secret-scan result |
| `SHA256SUMS` | integrity hashes for the preservation artifacts |

The tracked diff was scanned for high-confidence private-key, API-key,
client-secret, access-token, password-assignment, and AWS-secret patterns; none
were found. Untracked contents were deliberately not copied, so environment
files, keys, caches, databases, dependency trees, archives, and other possible
runtime state are not embedded in the preservation artifact.

The dirty original includes broad tracked deletions, IDE metadata changes,
generated/static output, dependency/cache directories, archives, audit notes,
and untracked source paths. Those changes belong to the existing checkout and
have not been discarded, restored, staged, or copied into the feature worktree.

## Facts versus hypotheses

Verified facts:

- The original checkout is materially dirty and contains both deletions and
  untracked work.
- The committed source identity recorded by the latest local published-artifact
  ref is `8c4e82d`.
- The current home component remains nearly identical to the recovered legacy
  visual implementation.
- A Next dev server is running from a separate `websites/dev` checkout.
- The clean feature worktree starts from exactly `8c4e82d`.

Open hypotheses that must not be treated as conclusions:

- The reason for the original checkout's broad deletions is not yet proven.
- The separate running dev checkout may or may not contain newer unique source;
  it has not been selected as canonical.
- A local publication ref does not by itself prove that the public site is
  currently serving that artifact; live verification is required later.
- Existing analytics/snapshot filter options may be complete, but source and
  API inspection must prove that before they can be treated as authoritative.

## Phase-0 exit decision

The repair may proceed only in the clean feature worktree. The original
checkout and existing dev server remain untouched. Workspace inventory,
GitLab normalization, CI/CD expansion, and server preparation remain blocked
behind the portal acceptance gate.
