# INS-001 Implementation Plan

1. Preserve and classify every dirty worktree before changing source.
2. Reconcile source, GitLab, production, artifact, SHAP configuration, VICS, and MDM truth.
3. Record preflight, QA items, release candidate, Today plan, runbook, evidence form, blockers, and fallback in Work Control.
4. Do not modify VICS routing until an authoritative contract and safe destination exist.
5. Do not create a mobile build until the candidate source is isolated and an exact rollback artifact is known.
6. Run the field checklist on every active device and attach evidence.
7. Update `FINAL_FIELD_RESULT.md` and Work Control QA statuses from observed evidence only.

## Rollout and rollback

- Use the existing GitLab package/deploy path and staging environment when a source change is actually required.
- Install only a signed, checksum-recorded artifact tied to a reviewed commit.
- Keep the previous installed artifact available and record its version, checksum, and installation method.
- Roll back only the affected component. Do not reset dirty repositories or replace existing systems.
- Preserve the Inspection Trac report and local recovery state if report delivery or VICS fails.

## rollout and rollback

Do not deploy merely because this task exists. Establish exact candidate and rollback identities first; use the existing GitLab release process and staging where available; install only the approved signed artifact; preserve reports if VICS fails. Field fallback is the last proven installed build plus local draft retention and named manual escalation, never false completion or fake production traffic.
