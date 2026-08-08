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
    definian/                   Definian identity, embedded auth, and overrides
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
and shared controls now live under `core`. Definian's embedded login page and
server token route live under `products/definian`.

## Local managed runner

The current Definian checkout is registered as the `definian-portal` profile
of the machine-wide `next-site` runner. It uses the central Process Compose
supervisor and keeps its runtime values outside this repository. For local
development, `DEFINIAN_EMBEDDED_LOGIN_UPSTREAM` explicitly delegates the
password exchange to the deployed HTTPS embedded-login endpoint instead of
copying the Auth0 client secret locally.

```sh
nulane-dev site definian-portal
nulane-dev status
nulane-dev logs next-site
```

Open `http://localhost:3000/`. Do not launch `npm run dev` separately or add a
second portal process; switch the existing `next-site` profile instead.
