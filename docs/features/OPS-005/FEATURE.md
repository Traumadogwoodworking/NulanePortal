# OPS-005: Finish Work Control execution views and Inspection Trac operations page

Status: verifying
Owner: shared
Scope: Compact the existing Today and task-detail views; finish the Inspection Trac operational readiness page from existing PostgreSQL, service-health, task/event, release, and evidence data; preserve Work Control as a thin execution/evidence console; do not build a planner, calendar, notification platform, aggregation service, or parallel source of truth.

## Outcome

A laptop user can open Work Control and, without excessive scrolling, see today's P0, blocked, approval, owner, evidence, due, and next-action work; open a compact task detail; and open one Inspection Trac operations page that clearly separates API/portal health from Android, iOS, release-identity, SHAP-module, incident, and verification readiness.

## Delivered behavior

Today /admin/control is now one compact execution table with P0, due-today, blocker, approval, missing-evidence and completed counts; it retains a collapsed feature intake form and recent timeline. Task detail now groups state, next action, evidence, last update, contract decisions and a bounded evidence timeline. /admin/inspection-trac is a separate operational-readiness page backed by existing PostgreSQL records: status strip, release identities, SHAP matrix, all durable QA, incidents, linked execution work, service health and recent verification. The canonical runner configuration already uses `docker compose ... up --build postgres web`; its monitored web process emits service samples without a Compose `service-monitor` target.

## Desired behavior

A laptop user opens Today and immediately sees actionable counts and one dense task table; opens a compact task detail for grouped state, evidence and decisions; then opens Inspection Trac and sees operational health, exact release identities, SHAP module readiness, incidents, services and recent verification without duplicating the task board.

## users and context

The primary operator is Matthew using a laptop-sized private local Work Control console during active engineering and field-readiness work. It must remain usable at a narrow laptop viewport, tolerate temporary service/API failures, preserve PostgreSQL task history, and clearly separate local evidence from production or physical-device proof.

## scope boundaries

In scope: existing AdminShell, Today dashboard, task detail, Inspection Trac service route, existing services/release/QA/evidence queries, explicit loading/stale/error/empty behavior, focused tests, canonical Compose validation, screenshots, and documentation. Out of scope: planner/calendar/timeline engine, new notifications, new source of truth, Redis, external deployment, production mutation, mobile code, portal code, backend API code, device testing, and broad unrelated cleanup.

## data and integrations

Use existing PostgreSQL tables and APIs only: tasks, append-only task_events, questions/approvals, evidence/QA, releases/components/snapshots, service monitors/samples, projects/repositories, and existing INS-001 evidence documents. Any narrow API response must derive server-side from these sources with explicit UNKNOWN for absent data; no fabricated health or frontend-owned durable semantics.

## failure behavior

Failures remain visible: retain prior useful data during refresh, label stale data with last-updated time, render API/service failures instead of empty healthy states, render true empty states separately, and never convert API HTTP 200 into overall mobile/SHAP readiness. Runner/config failures surface as blockers with evidence.
