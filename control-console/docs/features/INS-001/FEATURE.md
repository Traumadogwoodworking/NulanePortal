# INS-001: Prepare and validate SHAP Inspection Trac field cutover

Status: working
Owner: Matthew Snider
Field visit: 2026-07-29, approximately 07:30-08:00 America/Detroit
Customer/facility: SHAP
Product: Inspection Trac
Scope: SHAP cutover truth, release identity, users, Stellantis VICS routing, large-submission proof, device-management validation, field evidence, rollback, and fallback. No unrelated Circle changes, fake production claims, replacement control planes, new MDM, or ad hoc delivery systems.

## Outcome

By the July 29, 2026 07:30-08:00 SHAP visit, Matthew has a truthful release/device/user/routing preflight, a phone-readable field runbook, an evidence form, safe fallbacks, and Work Control records every verified result and remaining unknown.

## Current behavior

Current production accepts SHAP Inspection Trac reports and email-delivers finalized reports, but production runs from a dirty mutable working tree; mobile source/artifact/device identities disagree; no current SHAP device inventory, installed-build proof, Hexnode tenant proof, or Stellantis VICS sender/acknowledgement path exists.

## Desired behavior

Every active SHAP device and required user is inventoried; the exact approved app build is installed and login/facility context works; a realistic large submission is proven through backend/media/PDF/portal; appropriate SHAP damage claims reach Stellantis VICS with durable acknowledgement and duplicate prevention; MDM check-in persists across lock, app closure, reboot, and reconnect.

## Exact scope

- Existing Inspection Trac mobile, API, portal, report-delivery, GitLab, production records, Work Control, and enrolled device-management system.
- SHAP organization/facility identity, active users, signed release identity, large-submission durability, SHAP damage-claim routing, evidence, rollback, and fallback.

## Explicit exclusions

- Unrelated Circle work, unrelated facilities, and unrelated report classes.
- Synthetic claims to a live Stellantis VICS destination.
- A new MDM, queue, report generator, workflow engine, control plane, or ad hoc outbound-delivery mechanism.
- Secret exposure, destructive Git operations, or irreversible device actions without explicit authorization.

## Known devices

- [UNKNOWN] Exact active SHAP device count, asset identifiers, models, operating systems, and installed Inspection Trac builds.
- [STALE EVIDENCE] A historical W50 record describes Android 11, Hexnode agent 18.3.1, no detected Device Owner/Profile Owner binding, and Inspection Trac 1.0.1+2. It is not current proof and is not proven to be an active SHAP device.

## Known users

- [VERIFIED FACT] Production has seven active user records with access to the canonical SHAP location; four have current request-log activity and three have none.
- [VERIFIED FACT] Two SHAP user records were invited on 2026-07-28 and have no request-log activity.
- [UNKNOWN] The required field-user roster, invitation completion, passwords, and successful current login on each SHAP device.

## Required release identity

- [UNKNOWN] No mobile release candidate is approved.
- [VERIFIED FACT] Current mobile source is `de021bc010712a93cefb000282598e4e25d956ef`, branch `snapshot/inspection-trac-app-20260711`, source version `1.0.16+17`, with 56 dirty status entries and four local commits not present on the tracked GitLab snapshot branch.
- [VERIFIED FACT] The local signed Android APK is `1.0.10+18`, SHA-256 `31a12da569b072f58f1920131233415bd3b3f0aaaf092ca5fe625e03b8722e93`.
- [VERIFIED FACT] The local signed iOS IPA is `1.0.9+18`, SHA-256 `c605acc92a85d6cdb771e152e8a8ad964e828eeb78371b61f1b891045ef2decd`.
- [UNKNOWN] Neither artifact has proven source-commit provenance, GitLab artifact identity, approval, or SHAP installation evidence.

## Requirements

- Stellantis VICS routing: SHAP damage claims only unless an authoritative contract proves additional report classes.
- Large submission: realistic damage submission at or above the prior failure profile, with physical-device, backend, exact media-count, PDF, portal, and delivery proof.
- Device management: enrolled persistently, checks in locked and after reboot/reconnect, and accepts a harmless remote command while visible apps are closed, subject to recorded operating-system limits.

## Risks

- Production API executes a heavily modified mutable server working tree rather than an immutable release.
- Mobile source, local artifacts, GitLab, and installed-device identities are not reconciled.
- No implemented Stellantis VICS sender, acknowledgement model, approved test destination, or credentials were found.
- Current Hexnode tenant, device inventory, enrollment mode, policies, and remote-support permissions are unavailable.
- Existing SHAP email routing includes a legacy Leadec recipient and can cause unintended dual delivery if changed without an approved routing contract.

## Unknowns

- Exact active devices and required users.
- Approved mobile build and rollback build.
- VICS endpoint/protocol, credentials, filename and facility identifiers, report-class contract, test route, schedule, acknowledgement semantics, and error recovery.
- Whether SHAP no-damage inspections belong in the VICS channel.
- Current MDM tenant inventory, enrollment mode, unattended-access capability, and powered-off limitations.

## Rollback and fallback

- Do not install or deploy until candidate and rollback identities are named.
- Preserve the last proven installed build until the candidate passes field verification.
- A failed VICS stage must not delete or change the committed Inspection Trac report.
- Preserve the local draft/outbox and record the backend report ID, media counts, PDF, portal status, and exact blocker.
- Use the approved existing manual escalation path when VICS or MDM is externally blocked; never report completion without acknowledgement.

## users and context

Matthew Snider is the internal owner and field operator. SHAP inspectors use organization Inspection-Trac and location it-9a6e0f-locawctshap on physical Android or iOS devices; exact active device count, models, installed builds, and required-user roster remain field-verified unknowns.

## scope boundaries

In scope: existing Inspection Trac mobile/API/portal/report-delivery, GitLab, production records, Work Control, and existing Hexnode/device-management state. Excluded: unrelated Circle work, unrelated facilities/report classes, synthetic live VICS claims, new MDM/control plane/queue/report generator, secret exposure, destructive git operations, and unsupervised irreversible device actions.

## data and integrations

Authoritative inputs are Git repositories for source, GitLab for pipelines/artifacts/deployments, production API/DB/logs for runtime/report truth, organization/location it-9a6e0f-locawctshap for SHAP context, existing report/email outbox and any proven VICS adapter, Hexnode/device records for management, and Work Control for task/QA/evidence state.

## failure behavior

Failure must preserve the committed Inspection Trac report, media, artifact, correlation IDs, local recovery state, and explicit stage status. Retry must be idempotent. VICS failure must remain visible and recoverable without duplicate claims. Missing device, contract, credential, or acknowledgement evidence remains UNKNOWN or blocked and never becomes a pass.
