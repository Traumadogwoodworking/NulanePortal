# INS-001 Verification

Record commands, test results, device/API/deployment evidence, remaining risks, and rollback source.

## 2026-07-28 pre-visit verification

- [VERIFIED FACT] `flutter test test/services/workflow_draft_store_test.dart test/submission/report_cache_methods_test.dart test/services/report_photo_upload_service_test.dart test/services/workflow_delivery_service_test.dart test/submission/verification_test.dart test/services/email_large_report_memory_test.dart` passed 78 tests.
- [VERIFIED FACT] Work Control `npm run type-check`, `npm run lint`, and `git diff --check` passed after the packet was added.
- [VERIFIED FACT] Database verification returned task `INS-001` as P0/working/Matthew, 20 QA items, three non-passing evidence records, eight July 29 Today items, six release components, and three open approval decisions.
- [VERIFIED FACT] Read-only connected Gmail searches returned zero matching messages for the VICS/VDICS, SHAP 928/SFTP, VASCOR 928/EDI/SFTP, and historical OBT query sets. This is bounded mailbox evidence, not proof that no external contract exists.
- [VERIFIED FACT] The suite covers 40 independently queued artifacts and repeated-submit idempotency, retained recovery state, partial-media retry, checksum failure, ambiguous acknowledgement reconciliation, authentication pause/resume, restart recovery, and bounded PDF-photo planning.
- [INFERENCE] These tests reduce risk in local persistence and transport state handling.
- [UNKNOWN] The 40-artifact test uses tiny synthetic byte arrays; the PDF test uses 26 realistic photos and the memory-budget test uses 45 photos. No automated test proves a realistic 40-photo end-to-end SHAP damage submission.
- [UNKNOWN] No physical SHAP device, installed build, authenticated user, network interruption, backend media count, generated PDF, portal row, VICS acknowledgement, or MDM persistence was proven.

## Prohibited conclusion

The passing local suite is not release approval, installed-device proof, backend proof, VICS proof, or MDM proof.

## Rollback source

- Mobile: UNKNOWN.
- API: UNKNOWN; production runs base commit `015dc6aa17b36e826b3cdef97ffd2c8e761595ad` plus extensive uncommitted changes.
- Portal: UNKNOWN; public GitHub Pages provenance is not tied to a reviewed source commit.

## verification

Require repository/branch/commit and dirty-state evidence; GitLab pipeline/artifact/deployment records; artifact version/checksum/signature; authenticated API and database acknowledgement; expected versus received media counts; PDF identifier/hash; portal state; VICS delivery/correlation/acknowledgement; screenshots/logs; and on-device/MDM command evidence tied to device, user, timestamps, and build.
