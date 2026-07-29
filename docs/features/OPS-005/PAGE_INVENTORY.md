# OPS-005 Page Inventory

Baseline captured at 2026-07-29 01:30 EDT from the canonical runner at
`http://127.0.0.1:4310`.

| Page | Intended purpose | Primary user decision | Current useful content | Duplicate or noisy content | Missing information | Required action |
|---|---|---|---|---|---|---|
| `/admin/control` | Cross-product execution and evidence for today | What is P0, blocked, waiting, or safe to start? | PostgreSQL tasks, statuses, blockers, recent events, feature interview | Giant hero, separate product cards, repeated counts, three card lanes, long timeline, completed cards | Evidence status, owner/due columns, compact next action, filters, stale timestamp | Replace the scattered board with a compact summary and one dense task table; retain interview as secondary |
| `/tasks/[taskId]` | One task's executable contract and evidence | What is the current state and what happens next? | Task state, scope, blocker, interview, append-only events, status controls | Oversized header, every interview answer and event consumes vertical space | Grouped current state, acceptance/evidence/decision views, compact recent timeline, technical references | Condense into operational sections and collapsible history |
| `/admin/services/inspection-trac-api` | Inspection-Trac operational readiness | Is the full system ready and what blocks it? | Real stored API health probe and latency | Raw dependency JSON dominates; API-only green state can be mistaken for system readiness | API/portal/mobile identities, SHAP matrix, P0 blockers, release conflicts, recent verification | Replace this route with the full Inspection-Trac operations view while retaining service probes |
| `/admin/circle` | Circle pilot operations | What blocks the pilot load? | Components, release, QA, plan, notifications and history | Multiple large cards and repeated sections | Compact page hierarchy and explicit stale/error state | Condense without changing Circle contracts |
| `/admin/services` | All production service probes | Which service needs attention? | Real stored health, latency and observed samples | Card grid and oversized header | Dense comparison, last failure and explicit empty/error state | Render compact service table |
| `/admin/services/docudent-api` | DocuDent API health | Is the API responding? | Real stored probe | Oversized header and raw JSON | Compact identity/last success/failure/log link | Use condensed generic service detail |

## Data and request inventory

| Page | Requests | Durable source |
|---|---|---|
| Today | `/api/overview`, `/api/circle`, `/api/services` | `tasks`, `task_events`, `projects`, `operators`, `notification_outbox`, Circle product tables, service samples |
| Task detail | `/api/tasks/[taskId]`, answer/status mutations | `tasks`, `questions`, append-only `task_events` |
| Inspection Trac | currently `/api/services`; required narrow Inspection-Trac operations response | `projects`, `product_components`, `component_snapshots`, `product_releases`, `product_release_components`, `qa_items`, `qa_evidence`, `dashboard_notifications`, `service_monitors`, `service_check_samples`, Inspection-Trac tasks/events |
| Circle | `/api/circle` and bounded QA/plan mutations | existing product, release, QA, evidence, plan, notification and integration-event tables |
| Services | `/api/services`, explicit `/api/services/sync` | `service_monitors`, `service_check_samples` |

## Baseline behavior

- The runner is healthy after the stale non-existent `service-monitor` Compose
  target was removed from the central `nulane-dev` command.
- Service sampling remains inside the existing Next.js web instrumentation.
- No browser console error was visible during the baseline load.
- Before screenshots are under
  `/Users/home/Desktop/Codex/artifacts/work-control/OPS-005/before/`.
