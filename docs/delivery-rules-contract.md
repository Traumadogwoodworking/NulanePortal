# Delivery Rules Contract

Portal status: frontend implemented against a local canonical rule shape. Backend support is not implemented in this repo.

## Required backend endpoints

- `GET /api/delivery-rules`
- `POST /api/delivery-rules`
- `GET /api/delivery-rules/:ruleId`
- `PATCH /api/delivery-rules/:ruleId`
- `DELETE /api/delivery-rules/:ruleId`
- `GET /api/delivery-rules/options`

## Canonical request shape

```json
{
  "name": "High severity hood damage at Main Yard",
  "enabled": true,
  "triggerLogic": "ALL_SELECTED_TRIGGERS",
  "triggers": {
    "facility": {
      "enabled": true,
      "facilityIds": ["facility_uuid_1"]
    },
    "damage": {
      "enabled": true,
      "rowLogic": "ANY_ROW",
      "rows": [
        {
          "fieldLogic": "ALL_FIELDS",
          "conditions": {
            "area": { "operator": "IN", "values": ["hood"] },
            "damageType": { "operator": "IN", "values": ["gouged"] },
            "severity": { "operator": "IN", "values": ["significant"] }
          }
        }
      ]
    }
  },
  "actions": {
    "cc": {
      "emails": ["claims@example.com", "yard-manager@example.com"]
    }
  }
}
```

## Canonical list response

```json
{
  "rules": [
    {
      "id": "rule_uuid_1",
      "organizationId": "org_uuid_1",
      "name": "High severity hood damage at Main Yard",
      "enabled": true,
      "triggerLogic": "ALL_SELECTED_TRIGGERS",
      "triggers": {
        "facility": {
          "enabled": true,
          "facilityIds": ["facility_uuid_1"]
        },
        "damage": {
          "enabled": true,
          "rowLogic": "ANY_ROW",
          "rows": [
            {
              "id": "row_1",
              "fieldLogic": "ALL_FIELDS",
              "conditions": {
                "area": { "operator": "IN", "values": ["hood"] },
                "damageType": { "operator": "IN", "values": ["gouged"] },
                "severity": { "operator": "IN", "values": ["significant"] }
              }
            }
          ]
        }
      },
      "actions": {
        "cc": {
          "emails": ["claims@example.com", "yard-manager@example.com"]
        }
      },
      "createdAt": "2026-05-17T00:00:00.000Z",
      "updatedAt": "2026-05-17T00:00:00.000Z"
    }
  ]
}
```

## Options response

```json
{
  "facilities": [
    {
      "id": "facility_uuid_1",
      "organizationId": "org_uuid_1",
      "name": "Main Yard",
      "code": "MAIN",
      "active": true
    }
  ],
  "damageTaxonomy": {
    "areas": [
      { "id": "hood", "code": "27", "label": "Hood" }
    ],
    "damageTypes": [
      { "id": "gouged", "code": "07", "label": "Gouged" }
    ],
    "severities": [
      { "id": "significant", "code": "4", "label": "Significant" }
    ]
  }
}
```

## Validation rules

- Derive organization scope from auth/session, not from the client body.
- Reject facility IDs outside caller scope.
- Reject empty trigger sets.
- Reject empty recipients.
- Normalize and deduplicate emails.
- Validate damage taxonomy IDs against canonical allowed values.
- Disabled rules must not evaluate.
- `ALL_SELECTED_TRIGGERS` requires every enabled trigger to match.
- `ANY_SELECTED_TRIGGER` allows either enabled trigger to match.
- Damage rows:
  - `ALL_FIELDS` means all selected fields in the row must match the same damage line.
  - `ANY_FIELD` means any selected field in the row may match.
  - `ANY_ROW` means any row can match.
  - `ALL_ROWS` means all rows must match.

## Storage recommendation

Use one table first:

```sql
email_delivery_rules
- id uuid primary key
- organization_id uuid not null
- name text not null
- enabled boolean not null default true
- trigger_logic text not null
- triggers_json jsonb not null
- actions_json jsonb not null
- created_by_user_id uuid null
- updated_by_user_id uuid null
- created_at timestamptz not null default now()
- updated_at timestamptz not null default now()
- deleted_at timestamptz null
```

## Evaluation behavior

- A report can have multiple damage lines.
- A rule matches when at least one damage line satisfies the rule conditions.
- Facility and damage triggers are evaluated using the selected trigger logic.
- CC recipients are the normalized, deduplicated recipient list on the rule.

## Portal note

- The portal currently persists delivery rules locally as a frontend adapter until backend routes are added.
- When backend support exists, the portal should swap the local adapter for the API contract above without changing the canonical rule shape.
