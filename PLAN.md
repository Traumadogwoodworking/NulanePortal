# Inspection-Trac Quick Branding Plan

## Current quick path

- Ship the current portal with Inspection-Trac visible branding.
- Keep the landing page compact, direct, and one-screen on normal desktop.
- Keep portal behavior, auth routing, dashboards, reports, users, and facilities intact.
- Centralize visible brand defaults in the existing branding preset and navigation seams.
- Switch the quick brand with `NEXT_PUBLIC_PORTAL_BRANDING=inspectionTrac`, `nulaneSystems`, or `docudent`.
- Keep `inspectionTrac` as the branch default unless the env var says otherwise.

## Later white-label path

- Replace the quick preset with a tenant config schema.
- Add explicit build targets.
- Add per-customer assets and config files.
- Add a GitLab CI build matrix for branded targets.
- Deploy with one Vercel project per target when that deployment model is approved.
