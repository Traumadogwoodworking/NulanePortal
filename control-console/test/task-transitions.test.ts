import assert from "node:assert/strict";
import test from "node:test";
import {
  assertTaskTransitionAllowed,
  isTerminalTaskStatus
} from "../lib/work/transitions";

test("complete and cancelled tasks require an explicit reopen workflow", () => {
  assert.equal(isTerminalTaskStatus("complete"), true);
  assert.equal(isTerminalTaskStatus("cancelled"), true);
  assert.equal(isTerminalTaskStatus("verifying"), false);
  assert.throws(
    () => assertTaskTransitionAllowed("complete", "working"),
    /explicit operator workflow/
  );
  assert.throws(
    () => assertTaskTransitionAllowed("cancelled", "verifying"),
    /explicit operator workflow/
  );
});

test("idempotent terminal and normal active transitions remain allowed", () => {
  assert.doesNotThrow(() =>
    assertTaskTransitionAllowed("complete", "complete")
  );
  assert.doesNotThrow(() =>
    assertTaskTransitionAllowed("working", "verifying")
  );
});
