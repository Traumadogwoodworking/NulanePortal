# INS-001 Current-State Preflight

Observed 2026-07-28 America/Detroit. Every material statement is classified.

## Work Control

- [VERIFIED FACT] Repository: `/Users/home/Desktop/Codex/worktrees/nulane-work-control-v1/control-console`.
- [VERIFIED FACT] Branch `codex/nulane-work-control-v1`, HEAD `c2c0adf5070c9fe232f5871bf3a62ee53d23f2ec`, no configured upstream.
- [VERIFIED FACT] Starting state contained seven modified tracked files and untracked Circle dashboard/API/components/services/tests, Circle feature docs, service-monitor work, instrumentation, and dossier outputs.
- [VERIFIED FACT] The dossier Markdown and JSON were untracked.
- [VERIFIED FACT] Database task `CIR-001` was complete while repository `FEATURE.md` said interviewing and generic acceptance boxes were unchecked.
- [VERIFIED FACT] Circle Work Control deployment evidence was stale relative to newer GitLab/production evidence in the dossier.

Dirty-state classification:

- Intended product work: schema, CLI, dashboard shell, Circle/services APIs and UI, Circle/service adapters, tests.
- Intended documentation: `docs/features/CIR-001/`, README changes.
- Generated output: dossier Markdown/JSON and screenshot/evidence outputs referenced by the dossier.
- Local environment state: `instrumentation.ts` is runtime integration state and requires owner review before commit classification.
- Experimental work: none safely separable from the existing product diff without owner review.
- Unrelated work: all Circle/service-monitor work is unrelated to INS-001 and remains untouched.
- Ignore candidates: generated evidence should be reviewed for retention/location; no ignore rule was changed.
- Human review: the entire uncommitted Circle pilot, dossier disposition, generated evidence, and runtime instrumentation.

## Inspection Trac mobile

- [VERIFIED FACT] Working repository: `/Users/home/Desktop/Codex/NulaneRepo`.
- [VERIFIED FACT] Branch `snapshot/inspection-trac-app-20260711`, HEAD `de021bc010712a93cefb000282598e4e25d956ef`, four commits ahead of tracked GitLab branch, and 56 dirty status entries.
- [INFERENCE] This is the most complete current local Inspection Trac tree, but GitLab does not designate it as an approved release branch.
- [VERIFIED FACT] Source `pubspec.yaml` says `1.0.16+17`.
- [VERIFIED FACT] Signed local Android APK says `1.0.10+18`; SHA-256 `31a12da569b072f58f1920131233415bd3b3f0aaaf092ca5fe625e03b8722e93`; modified 2026-07-25.
- [VERIFIED FACT] Signed local iOS IPA says `1.0.9+18`; SHA-256 `c605acc92a85d6cdb771e152e8a8ad964e828eeb78371b61f1b891045ef2decd`; modified 2026-07-25.
- [VERIFIED FACT] Local GitLab mobile default branch is `feature/normalize-rsa-rail-scan-payload` at `3a1a252`; snapshot branch is `db9671b`; no mobile pipelines or deployments exist.
- [UNKNOWN] Artifact source commits, approval, release channel, last-known-good build, installed SHAP build, and whether SHAP uses Android, iOS, or both.
- [VERIFIED FACT] No Android device was attached; one personal iPhone was paired/available, but it is not established as a SHAP device.

Large-submission implementation:

- [VERIFIED FACT] Current dirty source has durable workflow drafts, app-owned artifact copies, immutable envelopes, per-artifact outbox jobs, idempotency keys, partial-media retry, authentication pause/resume, restart recovery, checksum blocking, and guarded cleanup.
- [VERIFIED FACT] The focused 78-test suite passed.
- [UNKNOWN] These changes are not tied to an approved signed artifact or installed SHAP device.

## Inspection Trac API

- [VERIFIED FACT] Local CI worktree: `/Users/home/Desktop/Codex/apis/inspection-trac-api-cicd`, branch `ci/staging-inspection-trac-setup`, HEAD `110c9b6`, five modified tracked files, one commit ahead of tracked staging branch.
- [VERIFIED FACT] GitLab staging branch is `3e80b44`; pipeline 279 passed validation/tests/package/image/publish, left deploy manual, and recorded a blocked staging deployment.
- [VERIFIED FACT] Production working directory is `/home/ubuntu/inspection-trac`, branch `feature/portal-filter-release-20260713`, base HEAD `015dc6aa17b36e826b3cdef97ffd2c8e761595ad`, with extensive modified and untracked runtime source.
- [VERIFIED FACT] PM2 executes that mutable working directory. Public `/api/health` and `/api/status` were HTTP 200/ready; this proves reachability, not release identity.
- [VERIFIED FACT] Production schema migration tracking contains 46 rows through `052_organization_suborg_filtering.sql`.
- [UNKNOWN] Immutable deployed commit, approved last-known-good release, and usable rollback release.
- [VERIFIED FACT] Report generation uses the existing report service/PDF path, media uses the existing storage/media tables and object-storage service, and email delivery uses `email_outbox`.

## Inspection Trac portal

- [VERIFIED FACT] GitLab portal main/staging commit `8c4e82d` passed pipeline 95 and deployment 32 to GitHub Pages on 2026-07-12.
- [VERIFIED FACT] Current public `gh-pages` ref is `9d92b0e`; public HTML was last modified 2026-07-24 and has SHA-256 `c2632d4de5c68f442e2e2c9357145614ec096520792449e31ece2df39a5703fb`.
- [UNKNOWN] The exact reviewed source commit and rollback target for the currently public portal.

## SHAP configuration and users

- [VERIFIED FACT] Canonical product organization is `Inspection-Trac`, UUID `b10aacea-684b-4c77-b2a5-76e7f32b196c`.
- [VERIFIED FACT] Canonical SHAP location is `it-9a6e0f-locawctshap`, active, label `SHAP`.
- [VERIFIED FACT] Facility metadata includes facility code `SHAP` and yard `SHAP-DROPZONE`.
- [VERIFIED FACT] Seven active users have access to SHAP; four have current authenticated request-log activity and three have no request-log activity.
- [VERIFIED FACT] Two user records were invited on 2026-07-28 and have no request-log activity.
- [UNKNOWN] Required roster, completed invitations, current passwords, per-device login, and least-privilege correctness.
- [VERIFIED FACT] No disabled SHAP-access user was found in the queried current access set.

## SHAP report state

- [VERIFIED FACT] Production contains 238 SHAP reports: 215 `complete`, 13 `VERIFIED`, and 10 `processing`.
- [VERIFIED FACT] The largest observed SHAP row has 39 `report_media` rows, 38 expected/received manifest media, PDF present, inspection type `000`, and no damage entries.
- [VERIFIED FACT] The largest observed SHAP damage report has 27 `report_media` rows, 26 expected/received manifest media, five damage entries, PDF present, and complete status.
- [VERIFIED FACT] At least two older SHAP damage reports remain `processing` with inconsistent media counters.
- [UNKNOWN] No production record proves a completed physical-device SHAP damage test at approximately 40 realistic photos.

## Stellantis VICS routing

- [VERIFIED FACT] No VICS/VDICS/928 sender, schedule, acknowledgement table, delivery-status table, external destination credential variables, or `outbound/928` implementation was found in the inspected repository, production process list, timers, cron, or server paths.
- [VERIFIED FACT] An existing chrooted VASCOR EDI SFTP dropbox is configured, but it is an inbound account for VASCOR and does not prove outbound Stellantis VICS delivery.
- [VERIFIED FACT] Current SHAP report delivery is SES email through `email_outbox`.
- [VERIFIED FACT] A one-off production script queued finalized SHAP reports to a legacy Leadec email recipient with `(report_id, email_type)` conflict prevention; 26 `raw_outbox` records were sent.
- [VERIFIED FACT] Current SHAP routing still includes the legacy Leadec recipient.
- [VERIFIED FACT] Read-only connected Gmail searches across All Mail returned no messages matching VICS/VDICS, SHAP plus 928/SFTP, VASCOR plus 928/EDI/SFTP, or the historical OBT alias plus SHAP/Stellantis/damage.
- [STALE EVIDENCE] Supplied 928 samples/manual describe every inspection, including clean inspections, while the immediate task requires SHAP damage claims. Facility-specific identifiers and applicability remain unapproved.
- [UNKNOWN] The mailbox search is bounded to the connected Gmail account and does not prove no contract exists elsewhere. VICS protocol/host/credentials, SHAP identifiers, report classes, file schedule/naming, test destination, acknowledgement semantics, duplicate contract, and recovery owner remain unknown.
- [INFERENCE] Implementing or changing routing now would risk false production claims, incorrect report scope, or dual delivery.

## Device management

- [VERIFIED FACT] A repo-local Hexnode inspection tool exists but no live Hexnode API configuration was present in this session.
- [VERIFIED FACT] No Android device is currently attached by ADB.
- [STALE EVIDENCE] Historical W50 documentation recorded the Hexnode agent but no Device Owner/Profile Owner binding and said reset was required for fully managed enrollment.
- [UNKNOWN] Active SHAP device count, Hexnode tenant records, groups, policies, enrollment mode, agent version, background/battery settings, unattended access, locked-state check-in, reboot startup, reconnect behavior, remote wake, and power-off behavior.

## Immediate blockers

1. [UNKNOWN] Approved mobile candidate and rollback artifact.
2. [UNKNOWN] Active SHAP device inventory and installed build identities.
3. [UNKNOWN] Required user roster and current successful logins.
4. [UNKNOWN] Approved Stellantis VICS contract, safe test route, credentials, SHAP identifiers, acknowledgement, and report-class scope.
5. [UNKNOWN] Live Hexnode tenant/device/policy access.
6. [VERIFIED FACT] Production API lacks immutable release/rollback provenance.

No production routing, deployment, mobile build, MDM policy, or device was changed during preflight.
