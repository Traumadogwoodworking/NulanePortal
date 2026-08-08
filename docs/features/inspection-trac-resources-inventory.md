# Inspection-Trac resources and training inventory

Status: Complete for the current portal/app build
Inventory date: 2026-08-08

## Navigation fix

The facility guide back link previously rebuilt the current guide URL when the query contained only `facility`. For example, `/resources/guides?facility=it-9a6e0f-locawctjn` linked back to itself. The guide now always returns to `/resources`, which is the Resources & Training index.

The facility guide also distinguishes two situations:

- a new user who still needs the configured access link;
- a user already inside the facility who should confirm Current Facility, choose the enabled workflow, and verify the yard and bay/area before starting.

## Portal page inventory

These entries follow the current portal navigation contract in `src/lib/navigation.ts`.

| Area | Route | What to expect | Access note |
| --- | --- | --- | --- |
| Core | `/home` | Filtered inspection totals, severity and damage-area analytics | Authenticated portal |
| Core | `/reports/damage` | Damage report list, filters, report detail, evidence, and exports | Reports module |
| Core | `/reports/rsa` | Rail Safe Audit reports | SHAP/RSA access |
| Core | `/inspection/24-hour` | 24-hour inventory inspection reporting | Reports module |
| Compatibility | `/dashboard` | Hidden/admin dashboard compatibility route | Not normal navigation |
| Apps | `/docudent` | Linked Inspection-Trac app/product surface | Module enabled |
| Administration | `/organizations` | Tenant and subscription administration | Organization admin |
| Administration | `/facilities` | Facilities, locations, yards, areas, access, and enrollment | Facility admin |
| Administration | `/users` | User and role administration | Facility admin |
| Administration | `/branding` | Portal appearance and branding | Super admin |
| Administration | `/email` | Notification settings | Facility admin |
| Support | `/support` | Support ticket submission and follow-up | Authenticated portal |
| Support | `/resources` | Facility guides, app walkthroughs, portal map, app links, and access PDFs | Authenticated portal |
| Support | `/settings` | Workspace and session settings | Authenticated portal |

## Mobile app page and workflow inventory

These entries follow the GoRouter route map in `NulaneRepo/lib/main.dart`, the launchable module definitions in `lib/core/app_control/app_module_definition.dart`, and the dashboard module grid.

| Route/surface | Screen or workflow | What to expect |
| --- | --- | --- |
| `/` and `/login` | Sign in | Signed-out users authenticate; authenticated users continue to Dashboard |
| `/dashboard` | Dashboard | Enabled workflow cards plus submitted, queued, and partial report status |
| `/vin-scan` | Damage Submission | Camera/hardware/manual VIN capture, facility selection, then inspection |
| `/inspection` | Inspection entry | Damage/no-damage decision, area, type, severity, photos, notes, save, and review |
| `/report-review` | Review and submit | Validation, evidence review, signature requirements, and submission state |
| `/pad-vin-scan` | Interchange | Interchange inspection with configuration-controlled availability |
| `/twenty-four-hour-vin-scan` | 24 Hour Inspection | 24-hour VIN-led inspection and confirmation |
| `/twenty-four-hour-confirm` | 24 Hour confirmation | Review the vehicle data and continue the 24-hour flow |
| `/rsa-car-scan` | Rail Ship Approved | Railcar/deck scan and RSA approval workflow |
| `/settings` | Settings & Legal | Current Facility, account, support, legal, tutorial replay, and scanner mode |
| `/app-control` | App Control | Admin/runtime visibility and diagnostics; not a normal field step |
| `/generic/:moduleId` | Generic configured module | Backend-driven form when the module is enabled |
| `/module/:moduleId` | Configured workflow module | Backend-driven workflow when the module is enabled |
| `/:moduleId` | Dynamic module fallback | Configuration-driven route; do not promise it unless visible on Dashboard |

## Current guide coverage

The Resources & Training catalog exposes these shared guides:

- Sign In and Select the Current Facility
- Scan or Enter a VIN
- Complete a Damage Inspection
- Complete a No-Damage Inspection
- Resume Saved Work
- Find a Submitted Report
- Export Facility Reports
- Get Help with Access or a Report
- Inspection-Trac App Screen Map
- Mobile App Workflow Inventory
- Inspection-Trac Portal Page Map

Every live facility also receives a generated facility guide containing configured yards, registration/support state, the already-inside-the-facility path, app expectations, workflow guidance, report handling, and recovery/help steps.

## Evidence boundaries

- The portal route map and app route map are verified from source code.
- Facility names, active yards, registration links, and support details are live data and may vary by organization/facility scope.
- Conditional modules are intentionally documented as conditional; a guide must not imply that a disabled or backend-required module is available.
- The inventory describes the current source-controlled screens. It does not claim that every backend-driven manifest variant has identical labels or fields.
