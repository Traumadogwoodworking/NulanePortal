# DocuDent Portal (portal-next)

Next.js 16/TypeScript SPA that replaces the legacy `nulane_systems_site` portal iframe with modular, typed routes.

## Setup

```bash
cd portal-next
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
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | Auth0 audience expected by the portal API | `https://api.nulanesystems.com` |
| `NEXT_PUBLIC_AUTH0_REDIRECT_URI` | Auth0 redirect target (defaults to the portal root) | `https://nulanesystems.com/portal` |

The Auth0 values above mirror the legacy portal; override them via `.env.local` when you run staging or local builds that point at a different Auth0 tenant or redirect URI.

The portal validates `NEXT_PUBLIC_DOCUDENT_EMBED_URL` at runtime and surfaces guidance when it is missing or malformed.

The default API base mirrors the legacy `resolveApiBase()` helper in `nulane_systems_site/index.html` (stripping `/api` when needed) so the same backend host is used unless `NEXT_PUBLIC_API_BASE_URL` overrides it.

## Local development and validation

```bash
npm run dev             # Next.js development server (Turbopack)
npm run lint            # ESLint
npx tsc --noEmit        # TypeScript checks
```
The portal now refuses to initialize on `localhost` unless `NEXT_PUBLIC_API_BASE_URL` points at a non-production backend. Set that env (and the matching Auth0 overrides above) before running these commands so you do not accidentally hit `https://api.nulanesystems.com/api` during development.


## Production validation (run outside the sandbox)

```bash
npm run build           # Next.js production build (Turbopack)
npm run start           # Run the build locally for smoke checks
```

If Turbopack build hangs in restricted environments (as seen in this sandbox), run these commands on a machine/CI that can execute `npm run build` and capture the standard `next build` output. After building, use `npm run start` to exercise the compiled server.

## Rollback guidance

If `portal-next` fails to boot or the config is invalid, revert the gateway/traffic routing back to the legacy portal entry point:

1. Point the reverse proxy / CDN origin to `https://nulanesystems.com/portal/index.html`.
2. Keep `nulane_systems_site/index.html` live as the fallback shell.
3. Any flows still tied to the legacy DOM (DocuDent embed, DocuFit uploads) continue running there until the new routes are battle-tested.
