# SHAP Field Runbook — July 29, 2026

Use one evidence form per device/test. Do not expose passwords, tokens, private keys, or complete credential URLs.

## Arrival

- [ ] Record arrival time.
- [ ] Identify every active device; do not assume the count.
- [ ] Record asset ID, model, OS, serial suffix, assigned user.
- [ ] Record Inspection Trac version/build and package/bundle ID.
- [ ] Record MDM platform, enrollment mode, group/policy, last check-in.
- [ ] Confirm organization `Inspection-Trac`.
- [ ] Confirm location `SHAP` / `it-9a6e0f-locawctshap`.

## User access

For every required user:

- [ ] Account exists and invitation is complete.
- [ ] Correct organization and SHAP access.
- [ ] Correct least-privilege role.
- [ ] Login succeeds on the assigned device.
- [ ] Dashboard and required workflows load.
- [ ] Record blocker without exposing the password.

## Approved build

- [ ] Compare installed build to the approved release-candidate record.
- [ ] If it differs, stop and identify the exact signed artifact and rollback first.
- [ ] Install/update only through the established approved method.
- [ ] Re-check version/build and login after update.

## Normal workflow

- [ ] Observe the actual operator workflow.
- [ ] Record expected steps and actual steps.
- [ ] Classify friction: training, configuration, deployment, connectivity, application, or unknown.
- [ ] Capture reproducible steps, timestamp, screenshot, and logs; do not blame the operator.

## Large submission

- [ ] Use an approved test VIN/record or authorized real inspection.
- [ ] Create realistic damage entries.
- [ ] Reach the agreed large-media profile, approximately 40 realistic photos within product limits.
- [ ] Background/resume once.
- [ ] Lock/unlock once.
- [ ] Confirm draft and all media remain.
- [ ] Interrupt/reconnect network at the approved safe point.
- [ ] Submit once; record local ID and timestamps.
- [ ] Verify backend report ID and durable acknowledgement.
- [ ] Verify exact expected and backend media counts.
- [ ] Verify report/PDF ID or hash.
- [ ] Verify portal row/status.
- [ ] Verify appropriate Stellantis VICS delivery ID and acknowledgement.
- [ ] Verify no duplicate report/claim.
- [ ] Verify final local draft/outbox state.

If an approved VICS test destination or contract is unavailable, do not send a synthetic production claim. Record VICS as `UNKNOWN — external blocker`.

## Device management

- [ ] Confirm device is online in the existing MDM.
- [ ] Lock screen; send harmless refresh/query; record acknowledgement.
- [ ] Close visible MDM and Inspection Trac apps; send another harmless command.
- [ ] Reboot; do not manually open the MDM app.
- [ ] Confirm automatic check-in after normal boot/network reconnect.
- [ ] Send another harmless command and record acknowledgement.
- [ ] Disconnect/reconnect network; verify check-in recovery.
- [ ] Verify Inspection Trac launches and login still works.
- [ ] Record any approval prompt or operating-system limitation.
- [ ] Do not claim unattended access unless no on-device approval was needed.
- [ ] Do not claim powered-off remote power-on unless demonstrated.

## Exit

- [ ] Every active device inventoried.
- [ ] Every required user onboarded/logged in or named blocker recorded.
- [ ] Approved build confirmed on every device.
- [ ] Normal workflow confirmed.
- [ ] Large test verified end to end or complete defect package captured.
- [ ] VICS acknowledged or explicit external blocker recorded.
- [ ] MDM lock/app-closed/reboot/reconnect tests recorded.
- [ ] Safe fallback is understood.
- [ ] Every unresolved defect has device, build, steps, timestamps, logs, screenshots, owner, and next action.
