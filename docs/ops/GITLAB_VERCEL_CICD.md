# GitLab to Vercel publishing

The Inspection Trac portal is published to Vercel only by the GitLab pipeline in `.gitlab-ci.yml`.

## Target

- GitLab project: `nulane/inspection-trac-portal`
- Vercel project: `inspection-trac-portal-dev`
- Vercel project ID: `prj_BSarJ0dL2TCvoKRSbTJnuiWCqnYX`
- Vercel team ID: `team_CczJOjtPJm7x5HiMADhsAkYb`
- Portal URL: `https://inspection-trac-portal-dev.vercel.app`
- Rail API: `https://api.nulanesystems.com/inspection-trac/api`

## Required GitLab variable

Configure `VERCEL_TOKEN` as a masked CI/CD variable in the GitLab project. Never put the token in the repository or job logs.

## Pipeline

For the default branch and `cicd/vercel-dev-cors`, GitLab:

1. Runs lint, TypeScript, and unit tests.
2. Pulls the linked Vercel production configuration.
3. Builds a Vercel prebuilt artifact without the development-session bypass.
4. Deploys that artifact to Vercel production.
5. Inspects the deployment and probes `/inspection/24-hour/`.

The deploy job uses the `inspection-trac-vercel-production` resource group so concurrent pipelines cannot publish over each other.

Do not run `vercel deploy` directly from a workstation for this portal. Push the reviewed revision to GitLab and use its pipeline as the deployment record.
