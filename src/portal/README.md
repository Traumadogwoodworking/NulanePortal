# Nulane portal application

`src/portal` is the product application root. Next.js requires filesystem routes
under `src/app`, so route files there must stay thin and delegate to this folder.

## Folder contract

```text
src/portal/
  core/                         shared portal code
    config/                     shared contracts and runtime types
    data/                       API, normalization, filters, and snapshots
    features/                   shared product features
    services/                   shared backend adapters
    ui/                         shared UI primitives and composed controls
  products/
    inspection-trac/            Inspection-Trac identity and configuration
    definian/                   Definian identity, configuration, and overrides
```

Code belongs in `core` when every branded portal should receive the same fix or
feature. Code belongs in a product folder only when its identity, deployment,
authentication mode, navigation, feature availability, or behavior is genuinely
different. Product folders may import the core; the core must not import a
product implementation.

## Current adapters

The older `src/lib` and `src/components` import paths remain as one-line
compatibility exports while routes and features are migrated. New shared code
must import from `@/portal/core/...`; new product-specific code must import from
`@/portal/products/<product>/...`.

The damage-report feature is the first complete shared slice. Its page,
current Inspection-Trac report manager, report-list API contract, analytics
filter options, normalizers, yard mapping, media resolution, snapshot hooks,
and shared controls now live under `core`. Definian's identity and product-only
configuration live under `products/definian`; authentication uses the shared
Auth0 PKCE client with the verified Definian organization.

## Local managed runner

The current Definian checkout is registered as the `definian-portal` profile
of the machine-wide `next-site` runner. It uses the central Process Compose
supervisor and keeps its runtime values outside this repository. For local
development, the public Auth0 values and server-only API upstream are supplied
by the managed runner environment. Passwords and Auth0 client secrets do not
belong in the portal login flow.

Definian browser API requests are pinned in `src/lib/config.ts` to
`https://api.nulanesystems.com/api`; environment overrides are intentionally
ignored for this product. The production API permits the Definian Vercel origin
and the managed local origin. The dynamic same-origin proxy route remains for
sibling portal profiles but is not Definian's selected API base.

Portal data and session state load when the application starts and after an
explicit user or mutation refresh. Idle timers, focus events, visibility
events, and reconnect events do not refresh the page or replace the current UI
state. The shared header intentionally has no organization selector; Definian
must not expose Inspection-Trac organization scopes in its global navigation.

```sh
nulane-dev site definian-portal
nulane-dev status
nulane-dev logs next-site
```

Open `http://localhost:3000/`. Do not launch `npm run dev` separately or add a
second portal process; switch the existing `next-site` profile instead.
