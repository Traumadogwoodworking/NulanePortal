# GitLab and Vercel CI/CD

The GitLab project `nulane/inspection-trac-portal` is the portal CI control plane.

## Branch model

- Feature branches and merge requests run lint, TypeScript, unit tests, and a static-export build.
- `staging` can deploy a manually approved Vercel Preview deployment.
- Protected `main` can deploy a manually approved Vercel Production deployment.
- Production is never deployed automatically from an unprotected branch.

## Required GitLab variables

Configure these under **Settings > CI/CD > Variables**:

| Variable | Protection | Masking | Scope |
| --- | --- | --- | --- |
| `VERCEL_TOKEN` | Protected | Masked | `*` |
| `VERCEL_ORG_ID` | Protected | Masked | `*` |
| `VERCEL_PROJECT_ID` | Protected | Masked | `*` |

Vercel environment variables, including `NEXT_PUBLIC_*` build values, remain in Vercel. The deploy jobs run `vercel pull` for the selected environment immediately before `vercel build`, so GitLab does not need duplicate copies of those values.

## Deployment flow

1. Merge reviewed work into `staging`.
2. Confirm lint, typecheck, unit tests, and static export succeeded.
3. Run `deploy_vercel_preview` manually.
4. Verify the preview URL saved as a job artifact.
5. Fast-forward or merge the tested staging commit into protected `main`.
6. Run `deploy_vercel_production` manually.

The Vercel CLI is pinned in `.gitlab-ci.yml`. CI pulls Vercel project settings and environment variables, builds into `.vercel/output`, and deploys that exact prebuilt output.
