# GitLab and GitHub Pages CI/CD

The GitLab project `nulane/inspection-trac-portal` validates and builds the portal. Production is the static output published to `Traumadogwoodworking/inspection-trac` on branch `gh-pages`.

## Branch model

- Feature branches and merge requests run lint, TypeScript, unit tests, and static-export validation.
- `staging` runs the same validation without publishing production.
- Protected `main` exposes the manually approved `deploy_github_pages` job.

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

The dirty application checkout is never used as the publication directory.
