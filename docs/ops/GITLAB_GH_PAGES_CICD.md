# GitLab and GitHub Pages CI/CD

The GitLab project `nulane/inspection-trac-portal` validates and builds the portal. Production is the static output published to `Traumadogwoodworking/inspection-trac` on branch `gh-pages`.

## Branch model

- Feature branches and merge requests run lint, TypeScript, unit tests, and static-export validation.
- `staging` runs the same validation without publishing production.
- Protected `deploy/inspection-trac-pages` is the promotion branch. A successful pipeline publishes its verified static artifact automatically.
- Protected `main` retains a manual emergency publish path.

## Required protected GitLab variables

| Variable | Protection | Masking |
| --- | --- | --- |
| `GITHUB_PAGES_SSH_KEY_B64` | Protected | Masked |
| `GITHUB_PAGES_KNOWN_HOSTS` | Protected | No |

The SSH key must have write access to `git@github.com:Traumadogwoodworking/inspection-trac.git`. GitHub's host key is pinned; CI does not use live `ssh-keyscan` as its trust decision.

Public build settings such as `NEXT_PUBLIC_API_BASE` and `NEXT_PUBLIC_AUTH0_*` may be configured as protected GitLab variables when their values differ from source defaults. These values are compiled into the static bundle.

## Publish flow

1. CI runs lint, typecheck, unit tests, and `npm run build`.
2. `npm run export:validate` verifies the generated `out/` tree.
3. CI creates and verifies a SHA-256 checksum for the static archive.
4. The manual production job clones only the remote `gh-pages` branch into a temporary directory.
5. `out/` is synchronized with `--delete`, excluding `.git`.
6. CI verifies `CNAME=inspection-trac.com`, `.nojekyll`, `index.html`, and `_next`.
7. The generated commit is pushed to the existing `gh-pages` branch.
8. CI reads the remote branch back and verifies that GitHub accepted the exact generated commit.

The dirty application checkout is never used as the publication directory.

## Promotion and rollback

Promote only reviewed commits to `deploy/inspection-trac-pages`. GitLab runs lint, TypeScript, unit tests, and static-export validation before the serialized publish job can start.

Rollback is a normal forward publish: revert the bad promotion on `deploy/inspection-trac-pages` (or merge the last known-good source revision), then push. The same pipeline rebuilds that source and creates a new `gh-pages` commit, so rollback does not require force-pushing or workstation access to the production branch.
