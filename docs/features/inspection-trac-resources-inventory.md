# Inspection-Trac Resources & Training inventory

Status: current implementation
Inventory date: 2026-08-10

## Starting state

- `/resources` was a flat list of 11 shared guides followed by a facility section that duplicated every shared guide once per facility.
- Guide bodies used ad hoc section names and rendered every section as a numbered procedure.
- Search covered guide prose and facility data, but had no category index and still suggested the unsupported term `bay`.
- Facility cards exposed a Facility settings link without checking facility-admin access.
- Registration lookup failures were silently converted to missing data.
- Invalid guide, missing facility, and unauthorized guide states were not distinguished.
- No approved AIAG/M-22 source PDF was found in the portal or mobile-app checkout.

## Source authorities used

| Subject                        | Source authority                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| Portal routes and access       | `src/lib/navigation.ts`, `src/lib/portalSession.tsx`                                                            |
| Facility and yard data         | `FacilitySummary`, `FacilityYard`, directory snapshot, facility registration service                            |
| Damage report review/export    | `src/components/reports/ReportsManager.tsx`                                                                     |
| Mobile VIN and inspection flow | Flutter router, VIN scan, inspection, and report review screens in `NulaneRepo/lib`                             |
| Railcar and chock flow         | `rail_inspection_workflow_screen.dart`, `origin_rail_inspection_screen.dart`, `workflow_preflight_service.dart` |
| Retry/offline behavior         | `workflow_delivery_service.dart`, `report_review_screen.dart`, submission engine                                |
| Facility onboarding material   | Live Chicago record, `chicagoHeightsQuickStart.json`, published PDF generator, and registration flow            |

## Implemented information architecture

1. Get Started
   - Start an Inspection
2. Complete Inspections
   - Complete a Damage Inspection
   - Complete a Rail Inspection
   - Use Damage Codes
3. Review Reports
   - Find and Export Reports
4. Manage Access
   - Get Account or Facility Access
   - Manage Facility Registration (facility admin)
   - Manage Users and Roles (facility admin)
5. Fix a Problem
   - Recover a Saved or Queued Report
   - Fix VIN Scanning

Every published guide contains only its exact app or portal location, numbered
actions, an observable Done state, and the shortest useful Problem recovery.

Facility-specific content is a generated overlay from live facility, active-yard, registration, and support data. Shared procedures are not copied once per facility.

## Evidence boundaries

- Dashboard visibility is the field operator’s source of truth for whether a module is available to the current account and facility.
- Rail guidance documents only the source-backed railcar, track (when shown), deck, spot, chock-status, evidence, damage, and queue behavior.
- The portal does not bundle an approved AIAG/M-22 source PDF. The damage-coding guide therefore explains Inspection-Trac inputs and explicitly does not claim to reproduce the standard.
- Unsupported facility subdivisions are not documented. Facility overlays use the typed facility and yard contract only.
- Administration guides are visible and directly accessible only to the existing facility-admin or super-admin roles.

## Facility onboarding path

- `chicagoHeightsQuickStart.json` is the typed canonical source for the title,
  purpose, registration URL, six steps, Done state, support request, stable
  facility ID, and Main yard.
- `FacilityQuickStartActions` is the shared UI path for the registration URL,
  QR, and published quick-start PDF. Resources and Facility Registration use
  it.
- `scripts/generate-published-facility-quick-start.mjs` is the only published
  quick-start document builder. It reads the canonical content and writes the
  one approved asset.
- Chicago Heights uses the one-page
  `public/resources/chicago-heights/chicago-heights-quick-start.pdf` through the
  same delivery path. Browser-generated Chicago PDFs are disabled, so users do
  not see competing quick starts.
- The Resources facility section lists only facilities with an approved
  quick-start asset. Chicago Heights is currently the only published facility;
  the underlying directory and Facilities administration data are unchanged.
- The live Chicago record has no registration slug. Its directory adapter uses
  the location UUID as the fallback slug, so the published asset resolver now
  matches the canonical slug first, then stable location ID, then an optional
  facility code.
- The Chicago Heights facility quick-reference page puts the approved PDF
  before its numbered steps and names scanning, account creation or sign-in,
  email verification, facility confirmation, and the Main-yard action.
- The published Chicago Heights QR decodes to
  `https://inspection-trac.com/join/chicago-heights`. The live browser flow
  resolves that path to the live Chicago Heights registration page.
- Pre-existing files under `output/pdf/` are historical inventory artifacts and
  are not the canonical downloadable material.
- No AIAG/M-22 PDF was located.
