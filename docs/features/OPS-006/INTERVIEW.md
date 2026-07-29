# OPS-006 Interview

Answers are authoritative requirements. Record one question and answer at a time.

## Question 1: outcome

**Question:** What concrete outcome should this feature produce for the person using it?

**Answer:** Matthew can open the private Work Control console and immediately see correct P0, due-today, blocked, approval, missing-evidence, completed-today, and INS-001 work, follow valid task links, and read every useful operational chart without a render crash or misleading empty state.

## Question 2: current_behavior

**Question:** What happens today, and where in the real product or workflow does it happen?

**Answer:** After the compact execution-view work, the Today page is reported partially broken and some charts or visualizations are broken. The exact failures must be reproduced against the canonical runner with console, network, server-log, response-shape, and screenshot evidence before repair.

## Question 3: desired_behavior

**Question:** What should happen instead, from the user’s first action through the final result?

**Answer:** Opening /admin/control should render real PostgreSQL-backed current work using America/Detroit operational date boundaries; filters and links should work; INS-001 should appear through its correct workflow; useful charts should tolerate numeric, timestamp, null, partial, empty, and API-failure inputs; refresh should retain useful state; and /admin/inspection-trac should remain intact.

## Question 4: users_and_context

**Question:** Who uses this, on which device or role, and under what real operating conditions?

**Answer:** Matthew uses the private local console on a laptop-sized browser during active engineering. It must remain legible at narrow widths, keyboard-usable, reliable across refresh and managed Docker restart, and truthful when data or a dependency is partial or unavailable.

## Question 5: scope_boundaries

**Question:** What is explicitly in scope, and what must not be changed?

**Answer:** In scope are the existing Today, task detail, compact-layout routes, current chart pages, their API/read-model contracts, focused tests, canonical managed runner, and local screenshots/logs. Out of scope are a planner, calendar, new task manager, notification framework, parallel data store, production deployment, mobile/API/portal product changes, device testing, and broad cleanup.

## Question 6: data_and_integrations

**Question:** Which real data sources, APIs, documents, devices, or external systems does this feature depend on?

**Answer:** PostgreSQL remains authoritative through existing tasks, task_events, questions/approvals, QA/evidence, release, service-health, and project/repository records. Existing Work Control APIs must carry those contracts. America/Detroit defines the operational day. Browser state may cache prior useful reads but may not become durable truth.

## Question 7: failure_behavior

**Question:** What should the user see and what should the system retain when a dependency, upload, test, or submission fails?

**Answer:** API or chart failures must render a visible error while retaining prior useful data and showing freshness. True empty data must have a distinct empty state. Null, undefined, NaN, negative, malformed numeric, partial-series, and unexpected timestamp inputs must not crash rendering or masquerade as healthy zeroes. Refresh and managed restart must recover without losing PostgreSQL state.

## Question 8: acceptance_criteria

**Question:** What exact conditions must be true for you to call this feature finished?

**Answer:** Today renders real current data and correctly exposes P0, due-today, blocked, awaiting approval, missing evidence, completed today, and INS-001; filters and task links work; every useful chart renders correct data plus empty and error states; console and server logs are clean; layout does not hide or overflow rows; refresh preserves useful state; and managed Docker restart recovery works.

## Question 9: verification

**Question:** What evidence is required—tests, device proof, API response, deployment check, screenshot, or user confirmation?

**Answer:** Required evidence is before/after screenshots, browser console and failed-request inspection on all primary and chart routes, response-schema samples, focused tests reproducing each defect, type-check, lint, test suite, git diff check, live local API/page smoke, America/Detroit boundary tests, narrow viewport and keyboard checks, nulane-dev logs, and managed restart recovery.

## Question 10: rollout_and_rollback

**Question:** How should this be released, monitored, and rolled back if the result is wrong?

**Answer:** Roll out only to the canonical local nulane-work-control runner after focused checks. Commit the Work Control repair separately from Inspection-Trac product fixes. Monitor /api/health, affected page/API requests, and bounded nulane-dev logs. Roll back by reverting only the repair commit and restarting nulane-work-control through nulane-dev while preserving PostgreSQL data.

## Question 11: definition_of_done

**Question:** What final handoff should be recorded so another Codex run or person can continue without reconstructing context?

**Answer:** Done means every reported Today and chart regression is reproduced, root-caused, fixed, tested, live-verified on the canonical local runner, committed and pushed; the Inspection Trac operations page remains useful; no parallel planning system is added; Work Control and Work Thoughts are synchronized; and device-dependent Inspection-Trac readiness remains BLOCKED.
