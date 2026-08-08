# Shared Nulane portal rules

This repository is becoming the shared Nulane portal platform. Read the
workspace rules plus `src/portal/README.md` before changing portal code.

## Ownership

- Put behavior shared by Inspection-Trac and Definian under `src/portal/core`.
- Put only identity, approved assets, modules, navigation, authentication mode,
  deployment configuration, and genuine overrides under
  `src/portal/products/<product>`.
- Keep `src/app` as thin Next.js route adapters.
- Existing `src/lib` and `src/components` forwarding files are compatibility
  seams, not locations for new shared implementations.
- Do not copy a shared feature into a product folder. Add a typed configuration
  or composition seam instead.

## Local runtime

- Use `nulane-dev site definian-portal` or the explicitly requested product
  profile. Do not launch another Next.js server.
- Confirm `nulane-dev site list`, `nulane-dev status`, and
  `nulane-dev logs next-site` before reporting runtime state.
- Local browser API calls must use the relative `/api/portal` base. The Next.js
  proxy reads server-only `PORTAL_API_UPSTREAM`; never solve localhost CORS by
  weakening production CORS or removing request/auth headers.
- Runtime secrets and upstream values belong in `/Users/home/.nulane/dev/env`
  or the deployment platform, never this repository.

## Definition of done

For an authenticated, data-backed portal change, completion requires:

1. focused tests and `npm run build`;
2. correct managed checkout/profile and readiness;
3. public/login route proof;
4. authentication failure proof and authenticated proof when a session is
   available;
5. a representative same-origin `/api/portal/...` request reaching the intended
   upstream, with browser/server logs checked;
6. explicit separation of local, GitLab/CI, Vercel deployment, and public
   production evidence;
7. updated operating documentation when paths, profiles, or environment
   contracts change.

If any applicable boundary is missing, report the work as `partial` rather
than complete and name the exact remaining proof.
