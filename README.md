# Definian Portal

Next.js 16/TypeScript portal for Definian Inspection. This worktree is the canonical Definian portal; it consumes shared Inspection-Trac portal features while keeping Definian branding, authentication, and deployment configuration product-specific.

## Source layout

- `src/portal/core/`: shared portal data, services, UI, and feature implementations.
- `src/portal/products/definian/`: Definian-only branding and product configuration.
- `src/portal/products/inspection-trac/`: Inspection-Trac product configuration used to keep shared behavior portable.
- `src/app/`: Next.js routes and server endpoints. Routes should delegate reusable behavior to `src/portal/core/`.
- `src/lib/` and `src/components/`: compatibility entry points and application shell code. Shared implementations should not be duplicated here.

When moving a newer Inspection-Trac feature into Definian, merge the implementation into `src/portal/core/` and retain the Definian product/auth configuration at the edge. Do not copy a second independent damage, report, session, or API-client implementation into the Definian product folder.

## Branding

Definian is the default for this branch.

```bash
npm run build
NEXT_PUBLIC_PORTAL_BRANDING=definianInspection npm run build
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
| `NEXT_PUBLIC_API_BASE_URL` | Ignored by the Definian build; retained only for compatibility with sibling portal profiles | Definian is pinned to `https://api.nulanesystems.com/api` |
| `NEXT_PUBLIC_PORTAL_API_BASE` | Selects the trusted same-origin API proxy for the Definian production project | Only `/api/portal` is accepted; all other values fall back to the canonical production API |
| `NEXT_PUBLIC_DOCUFIT_BASE` | Base for DocuFit health and future contract endpoints | `/docufit` |
| `NEXT_PUBLIC_DOCUDENT_EMBED_URL` | Absolute URL to the Flutter web bundle embedded on `/docudent` | `https://nulanesystems.com/portal/app/index.html` |
| `NEXT_PUBLIC_AUTH0_DOMAIN` | Auth0 tenant domain that backs the portal SSO | `definian-inspection.us.auth0.com` |
| `NEXT_PUBLIC_AUTH0_CLIENT_ID` | Auth0 application client ID used when redirecting to login | `YRnnNwl2hEYbYIe4jSIYNiE457nEWek4` |
| `NEXT_PUBLIC_AUTH0_ORGANIZATION_ID` | Required Definian organization context | `org_Da9cTbhrMc9e5tdw` |
| `NEXT_PUBLIC_AUTH0_AUDIENCE` | Auth0 audience registered for this portal | `https://api.nulanesystems.com` |
| `NEXT_PUBLIC_AUTH0_REDIRECT_URI` | Auth0 callback target | `<portal-origin>/auth/callback/` |

The Definian identity has moved from the legacy `nulanesystems.us.auth0.com` tenant and its `WkYT...QsPc` client to `definian-inspection.us.auth0.com` and the Definian `YRnn...Wek4` client. Other portal products retain their own tenant/client configuration.

The portal validates `NEXT_PUBLIC_DOCUDENT_EMBED_URL` at runtime and surfaces guidance when it is missing or malformed.

The Definian upstream API is fixed at `https://api.nulanesystems.com/api`. The dedicated production project sets `NEXT_PUBLIC_PORTAL_API_BASE=/api/portal`, allowing the browser to reach that upstream only through the existing same-origin proxy. Arbitrary environment URLs cannot redirect this product build.

## Local development and validation

```bash
nulane-dev status       # inspect the managed runner first
nulane-dev logs next-site
npm run lint            # ESLint
npm test                # full Vitest suite
npm run build           # Next.js server build
npm run export:validate # validates required server routes (or a static export when configured)
```

Recurring local development is owned by the `next-site` Process Compose runner. Its active profile must be `definian-portal`; do not start a second unmanaged Next.js server. Runtime variables live outside the repository under `/Users/home/.nulane/dev/env/`.

### Auth0 Universal Login

Definian uses a top-level Auth0 Authorization Code + PKCE redirect from `/login/` and completes the callback at `/auth/callback/`. The verified Definian Auth0 organization is required so Universal Login applies the Definian organization context and branding.

- Allowed Callback URLs: `http://localhost:3000/auth/callback/`, `https://vercel-portal-exact.vercel.app/auth/callback/`, `https://signal.definian.com/auth/callback/`
- Allowed Logout URLs: `http://localhost:3000/`, `https://vercel-portal-exact.vercel.app/`, `https://www.definian.com/signal`, `https://signal.definian.com/`
- Allowed Web Origins: `http://localhost:3000`, `https://vercel-portal-exact.vercel.app`, `https://signal.definian.com`
- Allowed Origins / CORS: `http://localhost:3000`, `https://vercel-portal-exact.vercel.app`, `https://signal.definian.com`

`https://www.definian.com/signal` remains the embedded portal page. The onboarding QR deliberately uses the separate stable production route `https://vercel-portal-exact-traumadogwoodworkings-projects.vercel.app/definian/start`. That route performs a server-side redirect to the existing canonical auth bootstrap at `https://vercel-portal-exact.vercel.app/login/?returnTo=https%3A%2F%2Fwww.definian.com%2Fsignal`, which keeps the PKCE transaction on the same origin as the fixed callback, creates a fresh Universal Login request at `https://definian-inspection.us.auth0.com`, and returns the completed session to the embedded Signal page. New users choose **Sign up** on the Auth0 screen; existing users sign in.

Production sets server-only `PORTAL_API_TENANT=definian`. The same-origin API proxy uses it to replace any client-supplied portal identity headers with the backend's existing trusted Definian tenant signal and canonical Signal referrer, allowing `/api/user/me` to provision fresh Auth0 organization members into the Definian portal organization.

An invalid or backend-rejected token is cleared before Universal Login is opened again. Existing Auth0 SSO sessions are allowed to continue without forcing credential entry.


## Deployment model

The Definian build includes `/api/portal/[...path]`, so production requires a Next.js server deployment (Vercel is supported). The same-origin `/api/portal` proxy is intentional: it forwards authenticated API requests and avoids browser CORS drift.

```bash
npm ci
npm run lint
npm test
npm run release:preflight
npm run build
npm run export:validate
```

## Workflow philosophy

- Keep customer branding in the central branding/navigation seams.
- Inspect first, then patch the narrowest real cause.
- Prefer simple code, local logic, and one obvious place for a style or behavior decision.
- Preserve working render paths unless simplification clearly improves correctness or debug speed.
- Avoid adding wrappers, helper layers, or reusable abstractions for one-off fixes.
- When a visual issue appears in a row, cell, line, or table, inspect the surrounding render tree and stylesheet sources before changing markup.
- Favor additive edits over rewrite-heavy refactors.
- Keep future debugging fast: fewer layers, fewer hidden side effects, and fewer places where a change can be lost.

## Release discipline

Local runner health, tests, and a production build are required before release, but they are not proof that production has been deployed. Verify the Vercel deployment, custom domain, Auth0 callbacks/origins, authenticated `/user/me`, and a real damage-report facility label after every production release.
