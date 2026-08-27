# DocuDent portal convergence

## Source and preservation boundary

This branch starts at the reviewed committed portal anchor
`52ce54dfa129a4688cce6291b0299e6c32511274`. The original checkout at
`/Users/home/Desktop/Codex/websites/dev/vercel-portal-exact` remains untouched.
Its newer dirty state is preserved in the Gate 0 snapshot and is not silently
treated as reviewed source. Future reliability changes from that delta must be
selected and verified individually.

The facility registration, QR, and Quick Start architecture comes from this
portal family itself. It was not copied from Circle. The generic components,
service contract, canonical URL handling, and PDF presentation seams remain.
Inspection-Trac customer packets, customer routes, and customer defaults are
not DocuDent source material.

## Product contract

- The portal defaults to DocuDent product identity and retains the Nulane
  company mark in the powered-by position.
- The authoritative logo assets match the mobile DocuDent assets by SHA-256.
- API URLs default to `https://api.nulanesystems.com/api` and may be overridden
  only through generic or DocuDent-specific variables.
- Auth0 domain, client ID, organization ID, and audience are required deployment
  inputs. There are no Inspection-Trac Auth0 fallbacks.
- RSA, 24-hour, AWCT signature, and Definian routes are absent from the
  DocuDent application route tree.

## Facility onboarding safety gate

The target DocuDent API has not yet proven the organization-membership,
facility-membership, role-assignment, registration-eligibility, and idempotency
contract used by the portal-family onboarding flow. Therefore
`NEXT_PUBLIC_DOCUDENT_FACILITY_ONBOARDING_ENABLED` defaults to false and every
registration service operation fails closed. Do not enable it based on an HTTP
health response or a UI-only test. Enable it only after authenticated disposable
user acceptance proves new-user, existing-user, and already-assigned-user flows
against the intended backend.

Published Quick Start content must be generated from authoritative DocuDent
facility records. No Inspection-Trac customer PDF is registered in the DocuDent
asset catalog. The historical Chicago Heights PDF still exists as an unreferenced
tracked donor artifact and must be removed through the repository's binary-asset
workflow before release.

## Verification boundary

The DocuDent identity/configuration/onboarding suite passes 44 tests across nine
test files, targeted ESLint has no errors, and the Next.js production build
succeeds with onboarding disabled. The generated route manifest contains none
of the excluded customer routes.

The full donor suite currently passes 169 of 178 tests. Its remaining nine
failures are confined to `resourceCatalog.test.ts` and `resourcesPage.test.tsx`,
which still assert that the removed Chicago Heights Inspection-Trac packet is
published. Those assertions must be replaced with authoritative DocuDent
facility fixtures when the target API contract is proven; restoring the
customer packet merely to make those tests pass would violate this product
boundary.
