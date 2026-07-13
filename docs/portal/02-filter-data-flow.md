# Portal filter and data flow

This document records the verified frontend-to-API flow before the canonical
query/facet changes. Facts are based on the committed portal source at
`8c4e82d` and the canonical API source at `8b3057c`.

## Canonical API source determination

The three likely backend paths are not interchangeable:

| Path | Verified role | Decision |
| --- | --- | --- |
| `/Users/home/Desktop/Codex/NulaneRepo/services/inspection-trac` | Older imported source/deploy material inside the mobile monorepo | Read-only reference; do not patch |
| `/Users/home/Desktop/Codex/apis/inspection-trac-api-source` | Clean detached worktree at `8b3057c`, mirrored by GitHub and local GitLab baseline refs | Canonical source base for backend code changes |
| `/Users/home/Desktop/Codex/apis/inspection-trac-api-cicd` | Clean staging/CI worktree at `cc1437a`, tracking `local-gitlab/staging/inspection-trac`; relevant API source is identical to `8b3057c` | Promotion/CI worktree; do not mix portal contract edits into its staging branch |

The documented production runtime is PM2 process `inspection-track-api` under
`/home/ubuntu/inspection-trac`, port 3002, routed publicly through
`/inspection-trac/api/`. That inventory is not proof of the currently deployed
SHA. Production was not contacted, restarted, or modified during this trace.

## Current ownership map

| Consumer | Current source | Ownership and limitations |
| --- | --- | --- |
| `/home` cards/charts/tables | `GET /api/dashboard/analytics` through `useDashboardAnalyticsSnapshot` | Aggregate owner. One unfiltered/base request and one filtered request run. Backend supports only date, facility/location, inspection type, module, status, inspector, elevated user, and recent limit. |
| `/home` VIN preview/export seed | `GET /api/reports/list`, fixed page 1 / 50 rows through `useReportListSnapshot` | Row preview only. It cannot prove complete results or provide authoritative options. |
| `/reports/damage` rows | `GET /api/reports/list`, page size 50, then explicit load-more | Row owner. Filters are applied server-side before pagination, but the component currently re-filters damaged summaries incorrectly. |
| Damage detail drawer | `GET /api/report/pull?report_id=...` | Detail/media hydration only. |
| `/reports/rsa` | `GET /api/railcar-scans/report/pull` through `usePortalReportsSnapshot` and bounded multi-page loading | RSA row owner. Track, spot, facility, search, and date filters are client-side over the fetched five-day window. |
| `/facilities` and directory context | `/api/organizations/:org/locations`, admin users, location memberships, and email-list endpoints through `usePortalDirectorySnapshot` | Authorized directory owner. Partial failures are combined into `partialError`; cached data may remain visible. |
| `/dashboard` | Power BI iframe | No portal filter/data contract is applied on this route. |
| `/analytics/:dashboardSlug` | Separate runtime render endpoint | Separate dashboard-runtime architecture. Its current filter bar derives choices from runtime report rows/aggregates and may show a local reference payload after failure; neither is authoritative portal-filter proof. |
| Home analytics snapshot | `POST /api/dashboard/home-snapshot/request` plus `GET /api/dashboard/home-snapshot/:id` | Hook exists but committed `HomeDashboard` and `ReportsManager` do not use it for current controls. Polling is bounded to 20 attempts / 45 seconds. Backend facet and authorization defects make it unsuitable as the authoritative facet source. |
| Development request trace | shared `apiClient.ts` registry and `PortalFetchDebugPanel` | Owns request ID, timeout, phase, error history, and a basic dev panel. It does not yet own canonical filter/facet diagnostics. |

## Endpoint inventory

| Frontend path | API endpoint | Parameters sent today | Pagination / terminal behavior | Authorization scope |
| --- | --- | --- | --- | --- |
| Home analytics | `GET /api/dashboard/analytics` | `from`, `to`, `facility_id`, `inspection_type`, `status`, `inspector_email`, plus several unsupported values; current serializer expands date-only `from`/`to` to browser-local boundary ISO timestamps | Aggregate response; backend default range is 30 days | Authenticated org plus resolved analytics/location scope |
| Home report preview | `GET /api/reports/list` | page 1, pageSize/limit 50, sort and current home query | Exactly one page for preview | Authenticated accessible organizations plus assignment/location restrictions |
| Damage report list | `GET /api/reports/list` | page, pageSize 50, sort, search, `facility_id`, `inspection_type`, status, yard, from/to, inspector | Filters and count precede limit/offset; UI loads more explicitly | Same report-list scope |
| Damage detail | `GET /api/report/pull` | `report_id` | One report detail | Authenticated report scope |
| RSA list | `GET /api/railcar-scans/report/pull` | limit/offset, date_from/date_to, location, railcar, report, inspector where provided | 200/page, max 20 pages, five-day default lookback, bounded stop rules | Backend must enforce org/location visibility; frontend filters are not an access boundary |
| Snapshot request | `POST /api/dashboard/home-snapshot/request` | body `{filters}` | queued/running/ready/failed; frontend max 20 polls / 45 seconds | Request resolves caller scope, but worker/reuse currently loses location-scope identity |
| Snapshot result | `GET /api/dashboard/home-snapshot/:id` | snapshot ID | terminal or timeout | Backend currently checks organization, not requester/location-scope identity |
| Facilities | `GET /api/organizations/:org/locations` | organization path value | Complete authorized active location list | Authenticated location scope |
| Directory users | `GET /api/admin/organizations/:org/users` | organization path value | Endpoint-defined | Requires user-read permission; facility managers are scoped |
| Runtime/session | `GET /api/user/me` | none | Single session response | Authentication owner; protected from this work |

## Control-to-query matrix

`All` values below describe current presentation state. The intended canonical
contract always represents All by an absent property.

| Page | Control | Frontend state | URL key | API key/value currently sent | Backend expectation | Current option source | Data endpoint / pagination | Authorization | Current bug | Intended correction |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/home` | Facility | `selectedFacilityKey`, default `"all"` | `facility` | analytics `facility_id=<selected>`; preview same | Canonical location ID; report list currently needs `location_id` for that value | Unfiltered/base analytics `byFacility` (30-day aggregate), not directory | analytics aggregate plus report preview page 1/50 | caller analytics/report scope | Report-list `facility_id` checks metadata facility fields, not `rm.location_id`; source is range-limited | Store location ID; endpoint adapter maps to `facility_id` for analytics and `location_id` for report list; facets provide full authorized options |
| `/home` | Yard | `yardFilter` | `yard` | `yard=<typed text>` | Report yard UUID, code, or name; canonical option value should be `organization_yards.id` | Free-text input | analytics aggregate plus report preview page 1/50 | caller scope | Analytics ignores yard. Snapshot maps yard to facility. Text can be label, code, or unrelated ID. | Authorized report facets return yard UUID/value and label; dashboard/report endpoints implement the same yard semantics |
| `/home` | Inspection type | `inspectionTypeFilter`, search label kept separately | `inspection_type` | `inspection_type="04"` after selection | Exact string `inspection_type_number`; preserve leading zero | Current filtered analytics `byInspectionType` | analytics aggregate | caller scope | Options can disappear with current filters; labels are synthesized as `Inspection Type NN` | Full authorized facets; canonical value remains `"04"`; labels presentation-only |
| `/home` | Inspector | `inspectorEmailFilter` | `inspector` (also parses `inspector_email`) | `inspector_email=<email>` | Case-insensitive canonical inspector email | Current filtered analytics `byInspector` | analytics aggregate | caller scope | Filter changes its own option source and can collapse choices | Complete authorized inspector facets |
| `/home` | Status | `statusFilter` | `status` | `status=<hard-coded value>` | Case-insensitive report status | Hard-coded open/review/closed/verified/archived | analytics aggregate | caller scope | Hard-coded list can omit real backend statuses | Complete authorized status facets |
| `/home` | Make | `makeFilter` | `make` | analytics `make=<text>`; preview includes `make` | Analytics does not support it; report list lacks individual make param | Free text | analytics plus preview page 1/50 | caller scope | Silently ignored by both current backend paths except combined report search elsewhere | Add parameterized make predicate and facet; exact canonical facet value |
| `/home` | Model | `modelFilter` | `model` | analytics `model=<text>`; preview includes `model` | Same defect as make | Free text | analytics plus preview page 1/50 | caller scope | Silently ignored | Add parameterized model predicate and facet |
| `/home` | Severity | `selectedSeverityLevel`, default `"all"` | `severity` | `severity=<1..6>` | Damage entry severity/code | Static damage taxonomy | analytics plus preview page 1/50 | caller scope | Analytics ignores it; preview re-filters only loaded rows | Add analytics/report support and authorized severity facets |
| `/home` | Damage area | `selectedDamageAreaFilter` | `damage_area` | `damage_area=<chart label>` | Damage area label or code under one documented canonical value | Top-area chart (top 10, current filtered range) | analytics plus preview page 1/50 | caller scope | Option is truncated and analytics ignores the selection; label/code ambiguity | Complete facet pairs; backend compares label and code separately and filters before aggregation |
| `/home` | Damage type | no current shared home state | none | none | Canonical damage type value | Not exposed as a shared control | analytics | caller scope | Canonical model and snapshot type exist, but page does not expose durable state | Add to shared page-supported filter config without changing layout unnecessarily |
| `/home` | Date from/to | `createdFrom`, `createdTo` | `from`, `to` | analytics expands browser-local day boundaries to ISO timestamps; report preview preserves date-only | Inclusive date semantics; SQL uses `>= from::date`, `< to::date + 1 day` | Analytics daily range | analytics and preview | caller scope | One UI selection has different wire formats and timezone transformations; browser history is replaced but popstate is not restored | Strict `YYYY-MM-DD` for all endpoints; document DB timezone after verification; shared URL hook handles back/forward |
| `/home` | Search/report/VIN | separate report/VIN fields; general `q` parsed but not wired | `q`, `report_id`, `vin` | report/VIN passed to typed client but backend list does not accept individual keys; analytics ignores them | Parameterized exact/report search contract | Text inputs | analytics plus preview page 1/50 | caller scope | Controls appear active while aggregate backend ignores them | Explicit endpoint support or visible unsupported state; never silent ignore |
| `/reports/damage` | Facility | `facilityFilter`, default `"all"` | none | `facility_id=<value>` | Canonical UI values are location IDs, so backend currently expects `location_id` | First loaded report rows, then summary labels/slugs | report list page 1/50 and load more | report-list scope | Options are paginated; wrong API parameter; client summary re-filter can compare ID to label | Shared URL state; complete authorized facet; adapter sends `location_id`; remove lossy re-filter |
| `/reports/damage` | Yard | `yardFilter` | none | `yard=<option value>` | `organization_yards.id` (also accepts exact code/name) | Session/YMS-like yard values plus current report rows | report list page 1/50 | report-list scope | Mixed yard domains; row-derived choices; lossy summary drops yard then re-filter rejects every row | Dedicated report facets with UUID values; render label separately; trust server-filtered rows |
| `/reports/damage` | Inspection type | `inspectionTypeFilter`, search label separate | none | `inspection_type="04"` | Exact string | First loaded rows only | report list page 1/50 | report-list scope | Paginated option discovery; lossy summary drops inspection type then re-filter rejects every row | Complete facet; preserve exact string; no lossy second filter |
| `/reports/damage` | Inspector | `inspectorEmailFilter` | none | `inspector_email=<email>` | Case-insensitive exact email | First loaded summaries only | report list page 1/50 | report-list scope | Paginated option discovery | Complete authorized facet and URL persistence |
| `/reports/damage` | Status | `statusFilter` | none | `status=<hard-coded value>` | Case-insensitive exact status | Hard-coded | report list page 1/50 | report-list scope | Can omit real values; client re-filters with default `open` fallback | Complete facet; backend authoritative |
| `/reports/damage` | Make/model | separate inputs but combined into debounced `search` | none | `search="<all text fields joined>"` | Current backend free-text OR across report ID, VIN, make, model, inspector | Text inputs | report list page 1/50 | report-list scope | Combining fields changes AND-like user intent into one OR query; no make/model facets | Add exact make/model params and facets; keep general search separate |
| `/reports/damage` | Severity/area/type | not available in current filter menu | none | service supports typed params but page sends none | Server has predicates, with label/code coalesce defect for area/type | none | report list | report-list scope | Required damage filters are absent from UI and URL | Add supported controls backed by complete facets; separate label/code OR predicates |
| `/reports/damage` | Date range | `createdFrom`, `createdTo` | none | `from`, `to` date-only | Inclusive end date | Bounds derived from loaded summaries | report list page 1/50 | report-list scope | Bounds are only the visible page; no durable URL | Shared strict URL query and server semantics |
| `/reports/damage` | Reset | many independent setters | none | properties cleared on rerender | Absent values | n/a | new page-1 request | same | Easy for fields/active chips to diverge; defaults mix `"all"` and empty | One canonical reset to `{}` plus page defaults in endpoint adapter |
| `/reports/rsa` | Facility, track, spot, search, date | local component state | none | RSA fetch uses default five-day window; most filters are client-side | Backend visibility must precede client filters | Fetched RSA rows | up to 20 x 200 pages | backend org/location scope required | Not part of shared durable query contract; option discovery is fetched-window only | Keep RSA-specific track/spot config, but reuse shared facility/date/search URL state where semantics match |
| `/facilities` | Selected facility | query `facility` read with `useSearchParams` | `facility` | directory/detail path values | Authorized location ID | Complete directory snapshot | directory endpoints | user-read/location scope | Selection is not the report filter contract, but uses the same domain ID | Reuse canonical facility value semantics; do not derive report facets from page cards |

## Proven root causes

1. **Lossy second filtering in `ReportsManager`.** `/reports/list` rows are
   converted by `listRowToSummary`. The returned `ReportSummary` omits
   `facilityId`, yard fields, and inspection type. The component then casts each
   summary back to `ReportDamageApiRow` and calls `matchesDamageReportFilters`.
   Any nonempty yard or inspection-type filter therefore rejects every row even
   when the backend returned the correct matches. Facility IDs can also fail
   because only display labels survive.
2. **Three incompatible yard domains.** Report rows use
   `report_metadata.yard_id -> organization_yards.id`; snapshot yards are copied
   from facility aggregates; YMS yard-state uses the separate `yards.yard_id`
   domain. They cannot be interchanged.
3. **Snapshot yard is implemented as facility.** Snapshot execution copies
   `yard` into `facility_id`, while its yard option list is copied from
   `analytics.byFacility`.
4. **Facility parameter mismatch.** The portal's directory value is a location
   ID. `/reports/list?facility_id=` checks metadata facility fields, while
   `/reports/list?location_id=` checks the canonical `rm.location_id` path.
5. **Paginated option discovery.** Damage page facility, inspection type,
   inspector, date bounds, and part of yard choices come from page 1 (50 rows)
   or subsequently visible pages.
6. **Analytics silently accepts unsupported UI filters.** The frontend type and
   URL builder include yard, make, model, severity, damage area, and search, but
   the analytics service ignores them. Snapshot normalization accepts several
   fields that its analytics worker also ignores.
7. **No authoritative complete facet contract.** Analytics defaults to 30 days;
   top area/type groups are limited to 10; dashboard-summary yards are capped at
   100 and organization-wide; snapshot facets omit statuses, makes, and models.
8. **Duplicated state and serialization.** Home has URL initialization and
   `replaceState`, damage reports have independent state with no URL, and
   services construct endpoint query strings separately.
9. **Snapshot authorization identity is incomplete.** Request-time location
   scope is not stored in the snapshot identity; workers reconstruct an
   organization-wide elevated scope; reuse and reads are organization-only.
10. **Request behavior is only partly standardized.** The shared API client
    supplies request IDs, timeout, abort, typed errors, and debug phases. It has
    no controlled network/5xx retry policy, and report hooks/components still
    mix SWR with imperative effects.
11. **Pagination request ownership is incomplete.** Initial damage loads use a
    sequence guard, but load-more requests do not. An old page request can
    append rows after the user changes filters.
12. **Home failure reporting is incomplete.** The report-preview error is
    calculated but never rendered, and the analytics terminal error has no
    direct retry action.
13. **The claimed complete export is bounded to one page.** The service constant
    `DAMAGE_REPORTS_SNAPSHOT_MAX_PAGES = 1` prevents the matching-row export
    helper from traversing additional pages even where UI copy describes a
    complete export.

## Exact yard defect statement

The yard filter has both a data-contract defect and a presentation-state
defect:

- The correct row field is `report_metadata.yard_id`, joined to
  `organization_yards.id` and exposed as `yard_id`, `yard_code`, `yard_name`.
- The correct canonical option value is `organization_yards.id`; code and name
  are labels/accepted compatibility aliases, not different yard identities.
- Current snapshot/YMS values are from different domains and cannot be sent as
  the report yard ID.
- Even if the API returns correct yard rows, the current damage page discards
  the yard field and rejects those rows in its second client-side filter.

A yard fix is not complete until both defects are removed and a real returned
row contract test proves every row matches the selected yard ID/code/name
semantics before pagination.

## Facet behavior decision

The initial canonical behavior will be **complete authorized dataset facets**:

- facets are calculated over all rows the current user may access;
- facet values do not change when another filter changes;
- facets do not exclude their own active selection;
- options are never derived from a report page, current cards, top-N aggregate,
  YMS operational state, or stale snapshot;
- all facet queries reuse the report-list organization/location/assignment
  predicates.

This is intentionally simpler and safer than self-excluding dynamic facets.
Dynamic facets can be added later only with an explicit backend contract and
tests.

## Date and timezone contract

The canonical frontend date format is `YYYY-MM-DD`. Current report and analytics
SQL treat `from` as inclusive and `to` as inclusive by implementing
`created_at >= from::date` and `created_at < to::date + interval '1 day'`.

The PostgreSQL session/database timezone governing those date casts has not yet
been verified. Until it is, the portal must not claim a specific UTC/business
timezone. The verification phase must record it against the controlled real-data
environment.

## Prior partial `analyticsFilterOptions` helper

The committed baseline does not contain `src/lib/analyticsFilterOptions.ts`.
That helper exists only in the separate dirty dev checkout on
`cicd/vercel-dev-cors` and is not being copied wholesale.

Its strategy of preferring snapshot/analytics options is invalid for the
current backend because snapshot yards are facilities, analytics is range- and
top-N-limited, several accepted filters are ignored, statuses/makes/models are
missing, and snapshot identity loses location scope. Any reusable normalization
ideas must be reimplemented against the new authorized facet response and
covered by contract tests.

## Required correction boundary

Frontend-only work can fix canonical state, URL persistence, deterministic
serialization, endpoint parameter mapping, lossy re-filtering, stale response
ownership, and visible error states. A narrow backend change is required to:

- expose complete authorized facets;
- make canonical facility/location semantics explicit;
- add exact make/model filters;
- make yard/inspection/damage aliases consistent;
- either implement or reject analytics filters rather than ignoring them;
- preserve location scope in snapshots before snapshots can be authoritative.

Those backend changes must be committed in their own API branch/commit and must
not be mixed into portal commits.
