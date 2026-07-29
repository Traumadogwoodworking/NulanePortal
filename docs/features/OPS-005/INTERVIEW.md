# OPS-005 Interview

Answers are authoritative requirements. Record one question and answer at a time.

## Question 1: outcome

**Question:** What concrete outcome should this feature produce for the person using it?

**Answer:** A laptop user can open Work Control and, without excessive scrolling, see today's P0, blocked, approval, owner, evidence, due, and next-action work; open a compact task detail; and open one Inspection Trac operations page that clearly separates API/portal health from Android, iOS, release-identity, SHAP-module, incident, and verification readiness.

## Question 2: current_behavior

**Question:** What happens today, and where in the real product or workflow does it happen?

**Answer:** Today /admin/control renders a giant hero plus scattered Circle, service-health, metric, lane, timeline, completed, and interview sections; task detail is card-heavy; /admin/services/inspection-trac-api is only a generic service probe. PostgreSQL already owns tasks/events, and existing service/release/QA/evidence tables exist, but operational identity and SHAP readiness are not presented together. The canonical runner had a stale service-monitor argument and is now healthy after that argument was removed outside the repository.

## Question 3: desired_behavior

**Question:** What should happen instead, from the user’s first action through the final result?

**Answer:** A laptop user opens Today and immediately sees actionable counts and one dense task table; opens a compact task detail for grouped state, evidence and decisions; then opens Inspection Trac and sees operational health, exact release identities, SHAP module readiness, incidents, services and recent verification without duplicating the task board.

## Question 4: users_and_context

**Question:** Who uses this, on which device or role, and under what real operating conditions?

**Answer:** The primary operator is Matthew using a laptop-sized private local Work Control console during active engineering and field-readiness work. It must remain usable at a narrow laptop viewport, tolerate temporary service/API failures, preserve PostgreSQL task history, and clearly separate local evidence from production or physical-device proof.

## Question 5: scope_boundaries

**Question:** What is explicitly in scope, and what must not be changed?

**Answer:** In scope: existing AdminShell, Today dashboard, task detail, Inspection Trac service route, existing services/release/QA/evidence queries, explicit loading/stale/error/empty behavior, focused tests, canonical Compose validation, screenshots, and documentation. Out of scope: planner/calendar/timeline engine, new notifications, new source of truth, Redis, external deployment, production mutation, mobile code, portal code, backend API code, device testing, and broad unrelated cleanup.

## Question 6: data_and_integrations

**Question:** Which real data sources, APIs, documents, devices, or external systems does this feature depend on?

**Answer:** Use existing PostgreSQL tables and APIs only: tasks, append-only task_events, questions/approvals, evidence/QA, releases/components/snapshots, service monitors/samples, projects/repositories, and existing INS-001 evidence documents. Any narrow API response must derive server-side from these sources with explicit UNKNOWN for absent data; no fabricated health or frontend-owned durable semantics.

## Question 7: failure_behavior

**Question:** What should the user see and what should the system retain when a dependency, upload, test, or submission fails?

**Answer:** Failures remain visible: retain prior useful data during refresh, label stale data with last-updated time, render API/service failures instead of empty healthy states, render true empty states separately, and never convert API HTTP 200 into overall mobile/SHAP readiness. Runner/config failures surface as blockers with evidence.

## Question 8: acceptance_criteria

**Question:** What exact conditions must be true for you to call this feature finished?

**Answer:** Canonical runner stable with no service-not-found loop; compact Today summary and dense task table expose P0, blocked, approval, evidence, owner, due and next action; INS-001 is immediately visible; compact task detail groups state, next action, blockers, acceptance, evidence, decisions, events and references; Inspection Trac shows explicit overall/API/portal/Android/iOS/SHAP/P0 states, exact known identities and mismatches, module matrix, incidents, services and verification; responsive/error/loading/empty/stale states work; no planner or parallel control plane is added.

## Question 9: verification

**Question:** What evidence is required—tests, device proof, API response, deployment check, screenshot, or user confirmation?

**Answer:** Verify with lint, typecheck, focused frontend and backend tests, database-backed API tests for changed contracts, Docker Compose config/build/start, nulane-dev runner stability and restart recovery, bounded logs, real-data browser checks at laptop and narrow viewports, clean console/network behavior, keyboard focus, explicit loading/empty/error/stale cases, and before/after screenshots of every primary changed page.

## Question 10: rollout_and_rollback

**Question:** How should this be released, monitored, and rolled back if the result is wrong?

**Answer:** Roll out only to the local canonical Work Control runner at http://127.0.0.1:4310 after focused validation. Commit changes by bounded concern. Monitor /api/health, page/API requests, and nulane-dev logs. No production deployment. Roll back by reverting the individual commit and restarting only nulane-work-control through nulane-dev while preserving the PostgreSQL volume and append-only events.

## Question 11: definition_of_done

**Question:** What final handoff should be recorded so another Codex run or person can continue without reconstructing context?

**Answer:** Done means the canonical runner is stable; Today, task detail, and Inspection Trac meet the stated dense operational contract using real PostgreSQL/service/evidence data; explicit unknown/error/stale/empty behavior works; focused tests, Compose build/start, restart recovery, browser console/network, responsive/keyboard checks, and before/after screenshots pass; commits are pushed; Work Control and Work Thoughts are synchronized; and missing physical/mobile proof remains BLOCKED or UNKNOWN.
