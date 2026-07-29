# INS-001 Interview

Answers are authoritative requirements. Record one question and answer at a time.

## Question 1: outcome

**Question:** What concrete outcome should this feature produce for the person using it?

**Answer:** By the July 29, 2026 07:30-08:00 SHAP visit, Matthew has a truthful release/device/user/routing preflight, a phone-readable field runbook, an evidence form, safe fallbacks, and Work Control records every verified result and remaining unknown.

## Question 2: current_behavior

**Question:** What happens today, and where in the real product or workflow does it happen?

**Answer:** Current production accepts SHAP Inspection Trac reports and email-delivers finalized reports, but production runs from a dirty mutable working tree; mobile source/artifact/device identities disagree; no current SHAP device inventory, installed-build proof, Hexnode tenant proof, or Stellantis VICS sender/acknowledgement path exists.

## Question 3: desired_behavior

**Question:** What should happen instead, from the user’s first action through the final result?

**Answer:** Every active SHAP device and required user is inventoried; the exact approved app build is installed and login/facility context works; a realistic large submission is proven through backend/media/PDF/portal; appropriate SHAP damage claims reach Stellantis VICS with durable acknowledgement and duplicate prevention; MDM check-in persists across lock, app closure, reboot, and reconnect.

## Question 4: users_and_context

**Question:** Who uses this, on which device or role, and under what real operating conditions?

**Answer:** Matthew Snider is the internal owner and field operator. SHAP inspectors use organization Inspection-Trac and location it-9a6e0f-locawctshap on physical Android or iOS devices; exact active device count, models, installed builds, and required-user roster remain field-verified unknowns.

## Question 5: scope_boundaries

**Question:** What is explicitly in scope, and what must not be changed?

**Answer:** In scope: existing Inspection Trac mobile/API/portal/report-delivery, GitLab, production records, Work Control, and existing Hexnode/device-management state. Excluded: unrelated Circle work, unrelated facilities/report classes, synthetic live VICS claims, new MDM/control plane/queue/report generator, secret exposure, destructive git operations, and unsupervised irreversible device actions.

## Question 6: data_and_integrations

**Question:** Which real data sources, APIs, documents, devices, or external systems does this feature depend on?

**Answer:** Authoritative inputs are Git repositories for source, GitLab for pipelines/artifacts/deployments, production API/DB/logs for runtime/report truth, organization/location it-9a6e0f-locawctshap for SHAP context, existing report/email outbox and any proven VICS adapter, Hexnode/device records for management, and Work Control for task/QA/evidence state.

## Question 7: failure_behavior

**Question:** What should the user see and what should the system retain when a dependency, upload, test, or submission fails?

**Answer:** Failure must preserve the committed Inspection Trac report, media, artifact, correlation IDs, local recovery state, and explicit stage status. Retry must be idempotent. VICS failure must remain visible and recoverable without duplicate claims. Missing device, contract, credential, or acknowledgement evidence remains UNKNOWN or blocked and never becomes a pass.

## Question 8: acceptance_criteria

**Question:** What exact conditions must be true for you to call this feature finished?

**Answer:** Acceptance requires all active devices and required users identified; approved build installed; login and SHAP context proven; normal and large physical-device submissions verified through exact backend media count, PDF and portal; Stellantis VICS delivery and acknowledgement proven without duplication; MDM persistence proven across lock, app closure, reboot and reconnect; release/rollback identities and fallbacks recorded.

## Question 9: verification

**Question:** What evidence is required—tests, device proof, API response, deployment check, screenshot, or user confirmation?

**Answer:** Require repository/branch/commit and dirty-state evidence; GitLab pipeline/artifact/deployment records; artifact version/checksum/signature; authenticated API and database acknowledgement; expected versus received media counts; PDF identifier/hash; portal state; VICS delivery/correlation/acknowledgement; screenshots/logs; and on-device/MDM command evidence tied to device, user, timestamps, and build.

## Question 10: rollout_and_rollback

**Question:** How should this be released, monitored, and rolled back if the result is wrong?

**Answer:** Do not deploy merely because this task exists. Establish exact candidate and rollback identities first; use the existing GitLab release process and staging where available; install only the approved signed artifact; preserve reports if VICS fails. Field fallback is the last proven installed build plus local draft retention and named manual escalation, never false completion or fake production traffic.

## Question 11: definition_of_done

**Question:** What final handoff should be recorded so another Codex run or person can continue without reconstructing context?

**Answer:** Work Control must contain this packet, 20 QA items, July 29 Today plan, current-state preflight, runbook, evidence form, release-candidate state, classified blockers, field-result template, exact changed files/tests, and a post-visit update using the required outcome sections. Completion is prohibited until physical-device, VICS, and MDM evidence is attached.
