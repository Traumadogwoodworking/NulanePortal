# DocuDent Portal

Next.js 16/TypeScript operational portal for DocuDent. The visible shell is Nulane Systems branded and the current product is DocuDent.

## Product configuration

DocuDent is the required product target for this worktree.

```bash
NEXT_PUBLIC_PORTAL_BRANDING=docudent npm run build
```

Reusable inherited modules remain in source but are hidden through the DocuDent product and navigation configuration. Do not enable another product target or import another product's tenant configuration in this worktree.

## Setup

```bash
npm install
```

Copy the DocuDent public environment template and customize only the deployment URLs that have been verified for the isolated environment:

```bash
cp .env.docudent.example .env.development.local
```

## Runtime configuration

| Env var | Purpose | Default / notes |
| --- | --- | --- |
| `NEXT_PUBLIC_PORTAL_BRANDING` | Product target | `docudent` |
| `NEXT_PUBLIC_API_BASE_URL` | Verified DocuDent API base | Required; use a non-production endpoint for local review |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | Auth0 tenant domain used by DocuDent | `nulanesystems.us.auth0.com` |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | Public DocuDent Auth0 application client ID | See `.env.docudent.example` |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | DocuDent API audience | `https://api.nulanesystems.com` |
| `NEXT_PUBLIC_AUTH0_REDIRECT_URI` | Callback URL for the isolated portal deployment | Must match the Auth0 application allowlist |
| `NEXT_PUBLIC_AUTH0_ORGANIZATION_ID` | Optional verified DocuDent Auth0 organization | Leave unset unless independently verified |

The portal must not initialize with an inherited organization ID. Auth0 organization prompting is enabled only when a verified DocuDent organization is explicitly configured.

## Local development and validation

```bash
npm run dev             # Next.js development server
npm run lint            # ESLint
npx tsc --noEmit        # TypeScript checks when needed
npm run build           # Static export build
```
The portal refuses to initialize on `localhost` unless `NEXT_PUBLIC_API_BASE_URL` points at a non-production backend. Set that value before local authenticated testing.

### Local Auth0 notes

With the default local redirect behavior, the DocuDent Auth0 application must allow:

- Allowed Callback URLs: `http://localhost:3000/auth/callback/`
- Allowed Logout URLs: `http://localhost:3000/`
- Allowed Web Origins: `http://localhost:3000`
- Allowed Origins / CORS: `http://localhost:3000` when the API tenant enforces browser origins for local API calls

Keep the isolated DocuDent development URL in the same Auth0 application only after that URL is known and approved.

PowerShell local run:

```powershell
$env:NEXT_PUBLIC_PORTAL_BRANDING = "docudent"
npm run dev
```

Localhost `invalid_token`, `login_required`, and `interaction_required` silent-auth failures clear the portal cache and Auth0 SDK cache before redirecting to login. Production keeps the normal Auth0 redirect behavior.


## Static export pipeline

This repo is configured to export a static site into `out/`.

```bash
npm run build
npm run export:validate
```

The export should produce:

- `out/index.html`
- `out/_next/`
- route folders with trailing slashes
- public asset copies used by the static site

The `out/` directory can be uploaded directly to a static host, cPanel `public_html`, or a CI artifact destination.

## Production validation (run outside the sandbox)

```bash
npm run build           # Next.js production build (Turbopack)
npm run start           # Serve the static out/ export locally
```

If Turbopack build hangs in restricted environments (as seen in this sandbox), run these commands on a machine/CI that can execute `npm run build` and capture the standard `next build` output. For this static export workflow, validate the generated `out/` folder with `npm run export:validate` and publish the contents of `out/` rather than running a Node server. `npm run start` serves the exported `out/` directory directly.

## Workflow philosophy

- Keep customer branding in the central branding/navigation seams.
- Inspect first, then patch the narrowest real cause.
- Prefer simple code, local logic, and one obvious place for a style or behavior decision.
- Preserve working render paths unless simplification clearly improves correctness or debug speed.
- Avoid adding wrappers, helper layers, or reusable abstractions for one-off fixes.
- When a visual issue appears in a row, cell, line, or table, inspect the surrounding render tree and stylesheet sources before changing markup.
- Favor additive edits over rewrite-heavy refactors.
- Keep future debugging fast: fewer layers, fewer hidden side effects, and fewer places where a change can be lost.

## Rollback guidance

If `portal-next` fails to boot or the config is invalid, revert the gateway/traffic routing back to the legacy portal entry point:

1. Point the reverse proxy / CDN origin to `https://nulanesystems.com/portal/index.html`.
2. Keep `nulane_systems_site/index.html` live as the fallback shell.
3. Any flows still tied to the legacy DOM (DocuDent embed, DocuFit uploads) continue running there until the new routes are battle-tested.
