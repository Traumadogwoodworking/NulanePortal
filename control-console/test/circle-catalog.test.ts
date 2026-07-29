import assert from "node:assert/strict";
import test from "node:test";
import {
  CIRCLE_COMPONENTS,
  CIRCLE_QA_ITEMS,
  CIRCLE_TODAY_ITEMS,
  QA_STATUSES
} from "../lib/circle/catalog";

test("Circle registers exactly one mobile, API, and portal component", () => {
  assert.deepEqual(
    CIRCLE_COMPONENTS.map((component) => component.code),
    ["mobile", "api", "portal"]
  );
  assert.equal(
    new Set(CIRCLE_COMPONENTS.map((component) => component.localPath)).size,
    3
  );
  assert.ok(
    CIRCLE_COMPONENTS.every(
      (component) =>
        component.gitlabProjectPath.startsWith("nulane/") &&
        component.runnerName.startsWith("circle-")
    )
  );
});

test("Circle QA catalog preserves the requested workflow and status contracts", () => {
  assert.equal(CIRCLE_QA_ITEMS.length, 13);
  assert.equal(new Set(CIRCLE_QA_ITEMS.map(([slug]) => slug)).size, 13);
  assert.deepEqual(QA_STATUSES, [
    "not_started",
    "testing",
    "passed",
    "failed",
    "needs_review",
    "blocked",
    "retest_required"
  ]);
});

test("Circle Today plan is ordered and remains within a focused workday", () => {
  assert.deepEqual(
    CIRCLE_TODAY_ITEMS.map((item) => item.sequence),
    [1, 2, 3, 4, 5]
  );
  const totalMinutes = CIRCLE_TODAY_ITEMS.reduce(
    (sum, item) => sum + item.estimatedMinutes,
    0
  );
  assert.equal(totalMinutes, 285);
});
