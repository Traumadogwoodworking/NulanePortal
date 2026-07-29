# INS-001 Acceptance Criteria

- [ ] Every active SHAP device is identified.
- [ ] Every active device runs the approved Inspection Trac version/build.
- [ ] Every required user is onboarded, assigned correctly, and can log in.
- [ ] Every device uses organization `Inspection-Trac` and location `it-9a6e0f-locawctshap`.
- [ ] The expected normal workflow works on each relevant device class.
- [ ] A representative large submission is completed from a physical device.
- [ ] Backend report and exact expected media count are verified.
- [ ] The complete report artifact is generated.
- [ ] The portal displays the correct report and status.
- [ ] The appropriate SHAP damage claim is delivered to Stellantis VICS.
- [ ] VICS acknowledgement or equivalent durable evidence is captured.
- [ ] No duplicate claim or report is created.
- [ ] No incorrect stranded/conflicting local draft remains.
- [ ] VICS failure does not erase the committed Inspection Trac report.
- [ ] Every device checks in to MDM while locked.
- [ ] Every device checks in after reboot without manually opening the MDM app.
- [ ] A harmless remote command works while the visible MDM and Inspection Trac apps are closed.
- [ ] Network reconnection restores management automatically.
- [ ] Mobile, API, portal, migration, report-generator, and routing identities are recorded.
- [ ] Work Control contains current evidence and every remaining failure has reproducible evidence and a safe fallback.

Do not mark this task complete from an automated test, a health response, a device success screen, a queued VICS record without acknowledgement, a single MDM console sighting, or a source commit without installed-build proof.

## acceptance criteria

Acceptance requires all active devices and required users identified; approved build installed; login and SHAP context proven; normal and large physical-device submissions verified through exact backend media count, PDF and portal; Stellantis VICS delivery and acknowledgement proven without duplication; MDM persistence proven across lock, app closure, reboot and reconnect; release/rollback identities and fallbacks recorded.

## definition of done

Work Control must contain this packet, 20 QA items, July 29 Today plan, current-state preflight, runbook, evidence form, release-candidate state, classified blockers, field-result template, exact changed files/tests, and a post-visit update using the required outcome sections. Completion is prohibited until physical-device, VICS, and MDM evidence is attached.
