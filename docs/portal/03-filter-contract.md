# Portal filter contract

This contract is implemented on the portal feature branch and in the isolated
Inspection-Trac API filter branch. Authentication behavior is unchanged.

## Canonical query

The portal stores backend values in URL-backed state. Display labels never
replace canonical values.

| Canonical field | URL parameter | Report-list parameter | Analytics parameter | Value semantics |
| --- | --- | --- | --- | --- |
| `dateFrom` | `from` | `from` | `from` | `YYYY-MM-DD`, inclusive |
| `dateTo` | `to` | `to` | `to` | `YYYY-MM-DD`, inclusive |
| `facilityId` | `facility` | `location_id` | `facility_id` | authorized facility/location ID |
| `yard` | `yard` | `yard` | `yard` | authorized yard ID |
| `inspectionTypeNumber` | `inspection_type` | `inspection_type` | `inspection_type` | string; leading zeroes preserved |
| `inspector` | `inspector` | `inspector_email` | `inspector_email` | backend inspector value |
| `status` | `status` | `status` | `status` | backend status value |
| `make` | `make` | `make` | `make` | backend text value |
| `model` | `model` | `model` | `model` | backend text value |
| `severity` | `severity` | `severity` | `severity` | backend severity code |
| `damageArea` | `damage_area` | `damage_area` | `damage_area` | backend damage-area code |
| `damageType` | `damage_type` | `damage_type` | `damage_type` | backend damage-type code |
| `search` | `q` | `search` | not sent | free-form report search |
| `reportId` | `report_id` | `report_id` | `report_id` | exact/free-form report ID |
| `vin` | `vin` | `vin` | `vin` | VIN text |

`All` is represented by an absent property. Empty strings and the literal
`all` are not sent. Query serialization is deterministic and rejects unknown,
malformed, or page-unsupported parameters. Facet-backed copied URL values are
checked against the complete authorized facets; unsupported values are visibly
reported and removed rather than sent as if valid.

Dates remain date-only strings at the request boundary. The API interprets the
end date through the end of the selected calendar day. No client timezone
conversion is applied to these date-only values.

## Authoritative facets

The portal consumes `GET /api/reports/filter-options`:

```ts
type PortalFilterOption = { value: string; label: string; count?: number };

type PortalFilterFacets = {
  facilities: PortalFilterOption[];
  yards: PortalFilterOption[];
  inspectionTypes: PortalFilterOption[];
  inspectors: PortalFilterOption[];
  statuses: PortalFilterOption[];
  makes: PortalFilterOption[];
  models: PortalFilterOption[];
  severities: PortalFilterOption[];
  damageAreas: PortalFilterOption[];
  damageTypes: PortalFilterOption[];
};
```

The endpoint builds facets from the complete authorized organization/location
scope before report-row pagination. Facets represent the complete authorized
dataset, not self-excluding dynamic facets. The portal does not fall back to
visible rows, cards, or paginated report summaries when this endpoint fails.

## Ownership and request behavior

- `/api/reports/filter-options` owns filter choices.
- `/api/dashboard/analytics` owns Home aggregates and chart groups.
- `/api/reports/list` owns filtered report rows and pagination.
- The optional Home snapshot flow remains bounded and does not race normal
  analytics into replacing filtered results.
- SWR and the shared request layer use finite retries only for network failures,
  timeouts, and selected 5xx responses. Authorization, validation, and schema
  failures are terminal and visible.
- Request/cache keys include both user and organization scope where data can
  differ by authorization scope.
- Home and Reports use the same URL parser, canonical state, facet semantics,
  and endpoint adapters.

## Yard defect

The prior UI could submit a yard label or select the first available alias,
while the report query compared `yard` to `report_master.yard_id`. Options were
also discoverable from incomplete rows. The corrected contract uses the facet
option's yard ID as `value`, keeps the yard name/code as presentation labels,
and compares the selected canonical ID before pagination. Client-side matching
now checks every known yard ID/label alias instead of letting the first label
mask the ID.
