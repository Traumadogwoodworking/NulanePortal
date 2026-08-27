# DocuDent portal convergence

## Source and preservation boundary

This branch starts at the reviewed committed portal anchor
`52ce54dfa129a4688cce6291b0299e6c32511274`. This convergence lane did not edit
the original checkout at
`/Users/home/Desktop/Codex/websites/dev/vercel-portal-exact`. Its dirty status
hash changed concurrently from the Gate 0 value `d8bd8697...` to `369c6033...`
while this lane was running, so the original cannot be described as globally
unchanged during the run. The Gate 0 snapshot remains the frozen recovery
authority, and newer dirty content is not silently treated as reviewed source.
Future reliability changes from that delta must be selected and verified
individually.

The facility registration, QR, and Quick Start architecture comes from this
portal family itself. It was not copied from Circle. The generic components,
service contract, canonical URL handling, and PDF presentation seams remain.
Inspection-Trac customer packets, customer routes, and customer defaults are
not DocuDent source material.

## Product contract

- The portal defaults to DocuDent product identity and retains the Nulane
  company mark in the powered-by position.
- The shipped identity is fixed to DocuDent; donor branding presets remain
  compatibility data and cannot be selected through a public environment flag.
- The authoritative logo assets match the mobile DocuDent assets by SHA-256.
- API URLs default to `https://api.nulanesystems.com/api` and may be overridden
  only through generic or DocuDent-specific variables.
- Auth0 domain, client ID, organization ID, and audience are required deployment
  inputs. There are no Inspection-Trac Auth0 fallbacks.
- RSA, 24-hour, AWCT signature, and Definian routes are absent from the
  DocuDent application route tree.

## Facility onboarding safety gate

The target DocuDent API now deploys the additive facility schema and the
server-owned opaque enrollment-session contract at backend revision
`68edb8496701b4774c6c9dc763682d255fdba420`. Its global production switch is
verified `enabled: false`, and no disposable Auth0 account has yet proven the
organization-membership, facility-membership, role-assignment,
registration-eligibility, and idempotency outcomes. Therefore
`NEXT_PUBLIC_DOCUDENT_FACILITY_ONBOARDING_ENABLED` defaults to false and every
registration service operation fails closed. Do not enable it based on an HTTP
health response or a UI-only test. Enable it only after authenticated disposable
user acceptance proves new-user, existing-user, and already-assigned-user flows
against the intended backend.

Published Quick Start content must be generated from authoritative DocuDent
facility records. No Inspection-Trac customer PDF is registered in the DocuDent
asset catalog. Candidate `0b962bce460e4a56324400e705c8bd32bbefdf1d`
removes the historical Chicago Heights binary donor artifact.

## Verification boundary

The full donor suite passes all 169 tests. The stale customer-specific assertions
were replaced with DocuDent's generic-resource and no-published-facility-packet
contract. The Next.js production build succeeds with onboarding disabled, and
`npm run validate:docudent-build` checks rendered HTML/RSC plus the generated
route manifest for customer identity and excluded routes.

Production-reachable public metadata, contact copy, landing/hero identity,
analytics fallback/copy and email-domain overrides, resource guidance, user facility selection, and
diagnostic namespaces are DocuDent-generic. The analytics page has no inherited
Power BI URL: it renders an unavailable state unless the target organization
supplies one.

Some donor compatibility modules remain in source but have no application
route: the RSA manager and styles, the 24-hour service, historical multi-brand
preset data, development-only fixtures, and analytics fixture labels. They are
not accepted as DocuDent product behavior and must not be reconnected. The
built-output guard deliberately tests rendered output and routes rather than
mistaking internal compatibility/schema identifiers for customer-facing copy.
The previously unreferenced Chicago PDF has been removed. On candidate
`0b962bce460e4a56324400e705c8bd32bbefdf1d`, all 169 tests, the Next.js
production build, and `npm run validate:docudent-build` pass. This is local
candidate evidence only: the portal remains undeployed and facility onboarding
remains disabled until a uniquely tagged disposable Auth0 identity proves the
DocuDent membership contract against the deployed backend.
