import assert from "node:assert/strict";
import test from "node:test";
import {
  countVerificationEvidenceEvents,
  isVerificationEvidenceEvent,
  verificationEvidenceDetails
} from "../lib/work/evidence";
import { verificationEvidenceSql } from "../lib/work/evidence-sql";

test("canonical and legacy verification events count once without paired progress", () => {
  const events = [
    {
      event_type: "verification",
      payload: { test: "npm test", result: "143 tests passed" }
    },
    {
      event_type: "status_changed",
      payload: {
        from: "working",
        to: "verifying",
        test: "flutter analyze",
        result: "No issues found"
      }
    },
    {
      event_type: "progress",
      payload: { message: "Verification: flutter analyze", result: "No issues found" }
    }
  ];

  assert.equal(countVerificationEvidenceEvents(events), 2);
  assert.deepEqual(verificationEvidenceDetails(events[1]), {
    test: "flutter analyze",
    result: "No issues found"
  });
  assert.equal(isVerificationEvidenceEvent(events[2]), false);
});

test("incomplete evidence is rejected and SQL uses the same durable fields", () => {
  assert.equal(
    isVerificationEvidenceEvent({
      event_type: "verification",
      payload: { test: "npm test" }
    }),
    false
  );
  const predicate = verificationEvidenceSql("event_row");
  assert.match(predicate, /event_type IN \('verification', 'status_changed'\)/);
  assert.match(predicate, /payload->>'test'/);
  assert.match(predicate, /payload->>'result'/);
  assert.throws(() => verificationEvidenceSql("bad alias;"), /Invalid SQL alias/);
});
