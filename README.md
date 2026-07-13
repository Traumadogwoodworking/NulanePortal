# Inspection-Trac Portal (portal-next)

Next.js 16/TypeScript SPA for the Inspection-Trac portal.

This branch ships the quick Inspection-Trac branded portal path. Branding is centralized in the current preset/navigation seams so the visible shell can be replaced later by a proper config-driven white-label build without rewriting stable portal code.

## Quick branding switch

Inspection-Trac is the default for this branch.

```bash
npm run build
NEXT_PUBLIC_PORTAL_BRANDING=inspectionTrac npm run build
NEXT_PUBLIC_PORTAL_BRANDING=nulaneSystems npm run build
NEXT_PUBLIC_PORTAL_BRANDING=docudent npm run build
```

Use `NEXT_PUBLIC_SUPPORT_EMAIL` and `NEXT_PUBLIC_REPORTS_EMAIL` to override public contact addresses. This is a quick reversible branding config, not the final tenant white-label system.

## Setup

```bash
npm install
```

Copy the public env file and customize it for your deployment:

```bash
cp .env.example .env.local
```

## Runtime configuration

| Env var | Purpose | Default / notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Base for `/api` routes (people, facilities, branding, notifications, etc.) | `https://api.nulanesystems.com/api` |
| `NEXT_PUBLIC_DOCUFIT_BASE` | Base for DocuFit health and future contract endpoints | `/docufit` |
| `NEXT_PUBLIC_DOCUDENT_EMBED_URL` | Absolute URL to the Flutter web bundle embedded on `/docudent` | `https://nulanesystems.com/portal/app/index.html` |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | Auth0 tenant domain that backs the portal SSO | `nulanesystems.us.auth0.com` |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | Auth0 application client ID used when redirecting to login | `WkYT29HkNJo5rjDMPGTxAdb04QdKQsPc` |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | Auth0 audience registered for this portal | `https://inspection-trac.us.auth0.com/api/v2/` |
| `NEXT_PUBLIC_AUTH0_REDIRECT_URI` | Auth0 redirect target (defaults to the portal root) | `https://nulanesystems.com/portal` |

The Auth0 values above mirror the legacy portal; override them via `.env.local` when you run staging or local builds that point at a different Auth0 tenant or redirect URI.

The portal validates `NEXT_PUBLIC_DOCUDENT_EMBED_URL` at runtime and surfaces guidance when it is missing or malformed.

The default API base mirrors the legacy `resolveApiBase()` helper in `nulane_systems_site/index.html` (stripping `/api` when needed) so the same backend host is used unless `NEXT_PUBLIC_API_BASE_URL` overrides it.

## Local development and validation

```bash
npm run dev             # Next.js development server
npm run lint            # ESLint
npx tsc --noEmit        # TypeScript checks when needed
npm run build           # Static export build
```
The portal now refuses to initialize on `localhost` unless `NEXT_PUBLIC_API_BASE_URL` points at a non-production backend. Set that env (and the matching Auth0 overrides above) before running these commands so you do not accidentally hit `https://api.nulanesystems.com/api` during development.

### Local Auth0 notes

The local portal runs under the `/portal` base path. With the default local redirect behavior, the Auth0 application must allow:

- Allowed Callback URLs: `http://localhost:3000/portal/`
- Allowed Logout URLs: `http://localhost:3000/portal/`
- Allowed Web Origins: `http://localhost:3000`
- Allowed Origins / CORS: `http://localhost:3000` when the API tenant enforces browser origins for local API calls

Keep the production URLs in the same Auth0 application when validating production:

- `https://nulanesystems.com/portal/`
- `https://nulanesystems.com`

PowerShell local run:

```powershell
$env:NEXT_PUBLIC_PORTAL_BRANDING = "inspectionTrac"
$env:NEXT_PUBLIC_PORTAL_BASE_PATH = "/portal"
npm run dev
```

Open a clean local browser profile when Auth0 has stale localhost tokens:

```powershell
$profile = Join-Path $env:TEMP "inspection-trac-portal-auth-clean"
Remove-Item -Recurse -Force $profile -ErrorAction SilentlyContinue
Start-Process msedge -ArgumentList "--user-data-dir=$profile", "http://localhost:3000/portal/home/"
```

If using Chrome instead of Edge:

```powershell
$profile = Join-Path $env:TEMP "inspection-trac-portal-auth-clean"
Remove-Item -Recurse -Force $profile -ErrorAction SilentlyContinue
Start-Process chrome -ArgumentList "--user-data-dir=$profile", "http://localhost:3000/portal/home/"
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
