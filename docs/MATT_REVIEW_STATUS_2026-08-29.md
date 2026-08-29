# Isolated DocuDent portal review status

Collected 2026-08-29 (America/Detroit).

## Result

The isolated DocuDent portal is deployed at
`https://docudent-portal.vercel.app`. Its operational shell uses Nulane Systems
branding, its product identity uses the existing DocuDent name/logo, and its
visible navigation is exactly:

1. Home
2. Damage Submissions
3. Support Tickets
4. Settings

The root route redirects to `/home`; it does not render a public landing or
marketing page.

## Source changes

- Removed inherited public, analytics, administration, facility, organization,
  user, resource, get-app, and marketing routes from this product build.
- Removed Inspection-Trac, AWCT, Definian, Circle, inherited tenant/facility,
  support, store-link, and endpoint defaults and assets.
- Reduced navigation and route-access logic to the DocuDent operational surface.
- Added build and static-export checks that require the four review routes and
  reject inherited routes and brand copy.

## Evidence

- Tests: 43 files / 150 tests passed.
- Build: production build and DocuDent build validator passed.
- Static output: required route/asset validator passed.
- Lint: 0 errors; 11 inherited warnings.
- Deployment: Vercel deployment `dpl_6KaZb4Pb7tUjNXZDRw1aTEn4RpB9` is assigned
  to `https://docudent-portal.vercel.app`.
- Live boundary: the stable URL returned the DocuDent/Nulane title, operational
  redirect, and none of the checked inherited identity markers.

## Remaining gate

The source and deployment use the stable callback
`https://docudent-portal.vercel.app/auth/callback/`, but the Auth0 application
allowlist has not yet been updated. The user deferred interactive Auth0 account
verification until the next session. No Auth0 setting was changed.

This is deployed and live-boundary evidence, not a completed authenticated Matt
review or customer acceptance. Inspection-Trac, Circle, and Definian deployments
were not modified.
