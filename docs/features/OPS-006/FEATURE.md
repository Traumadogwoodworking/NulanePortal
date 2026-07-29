# OPS-006: Repair Work Control Today and chart regressions

Status: verifying
Owner: shared
Scope: Repair observed Today, task-detail, chart, empty/error/stale, timezone, link, and compact-layout regressions using existing PostgreSQL/API authority and the canonical nulane-dev runner. Preserve /admin/inspection-trac. Do not add a planner, calendar, task manager, notification framework, parallel state store, production deployment, or device testing.

## Outcome

Matthew can open the private Work Control console and immediately see correct P0, due-today, blocked, approval, missing-evidence, completed-today, and INS-001 work, follow valid task links, and read every useful operational chart without a render crash or misleading empty state.

## Current behavior

After the compact execution-view work, the Today page is reported partially broken and some charts or visualizations are broken. The exact failures must be reproduced against the canonical runner with console, network, server-log, response-shape, and screenshot evidence before repair.

## Desired behavior

Opening /admin/control should render real PostgreSQL-backed current work using America/Detroit operational date boundaries; filters and links should work; INS-001 should appear through its correct workflow; useful charts should tolerate numeric, timestamp, null, partial, empty, and API-failure inputs; refresh should retain useful state; and /admin/inspection-trac should remain intact.

## users and context

Matthew uses the private local console on a laptop-sized browser during active engineering. It must remain legible at narrow widths, keyboard-usable, reliable across refresh and managed Docker restart, and truthful when data or a dependency is partial or unavailable.

## scope boundaries

In scope are the existing Today, task detail, compact-layout routes, current chart pages, their API/read-model contracts, focused tests, canonical managed runner, and local screenshots/logs. Out of scope are a planner, calendar, new task manager, notification framework, parallel data store, production deployment, mobile/API/portal product changes, device testing, and broad cleanup.

## data and integrations

PostgreSQL remains authoritative through existing tasks, task_events, questions/approvals, QA/evidence, release, service-health, and project/repository records. Existing Work Control APIs must carry those contracts. America/Detroit defines the operational day. Browser state may cache prior useful reads but may not become durable truth.

## failure behavior

API or chart failures must render a visible error while retaining prior useful data and showing freshness. True empty data must have a distinct empty state. Null, undefined, NaN, negative, malformed numeric, partial-series, and unexpected timestamp inputs must not crash rendering or masquerade as healthy zeroes. Refresh and managed restart must recover without losing PostgreSQL state.

## implementation note

The inspected Work Control routes contain no chart components or chart library. The reported broken operational surface was the Today count/filter model and the evidence presentation, so this repair does not invent a chart or planner. It makes submitted QA and verification proof visible at the top of Inspection Trac, applies one evidence contract to counts and display, and leaves detailed blockers and unknowns below the proof.
