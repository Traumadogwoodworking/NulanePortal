# Dashboard Package Format

A dashboard package is the runtime version of the current `/home` pattern.

```text
dashboard package =
  dashboard definition
  datasets
  fields
  filters
  permissions
  adapters
  runners
  widgets
  layout
  tests
  publish state
```

Minimum JSON shape:

```json
{
  "version": 1,
  "slug": "home-inspection-overview",
  "title": "Home Inspection Overview",
  "datasets": [],
  "widgets": [],
  "layout": []
}
```

Each visual is a recipe:

```json
{
  "id": "damage-vs-clear",
  "title": "Damage vs Clear",
  "kind": "metric",
  "datasetId": "dashboard_analytics",
  "measures": ["totals.damageReports", "totals.noDamageReports"],
  "dimensions": ["scope.organization_id"],
  "requiredFields": ["totals.damageReports", "totals.noDamageReports"],
  "component": "RuntimeMetricWidget",
  "exportFile": "damage-vs-clear.csv"
}
```

Rules:

- Do not infer damaged counts from totals.
- Do not mix RSA into damage submissions.
- Declare missing backend fields as coverage requirements.
- Keep source execution on the backend.
- Keep widgets passive.
