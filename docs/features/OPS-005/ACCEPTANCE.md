# OPS-005 Acceptance Criteria

- [x] Exact acceptance criteria captured from the completed interview.
- [x] Failure and recovery behavior is explicit.
- [x] Required roles, devices, data, and integrations are named.

## acceptance criteria

Canonical runner stable with no service-not-found loop; compact Today summary and dense task table expose P0, blocked, approval, evidence, owner, due and next action; INS-001 is immediately visible; compact task detail groups state, next action, blockers, acceptance, evidence, decisions, events and references; Inspection Trac shows explicit overall/API/portal/Android/iOS/SHAP/P0 states, exact known identities and mismatches, module matrix, incidents, services and verification; responsive/error/loading/empty/stale states work; no planner or parallel control plane is added.

## definition of done

Done means the canonical runner is stable; Today, task detail, and Inspection Trac meet the stated dense operational contract using real PostgreSQL/service/evidence data; explicit unknown/error/stale/empty behavior works; focused tests, Compose build/start, restart recovery, browser console/network, responsive/keyboard checks, and before/after screenshots pass; commits are pushed; Work Control and Work Thoughts are synchronized; and missing physical/mobile proof remains BLOCKED or UNKNOWN.
