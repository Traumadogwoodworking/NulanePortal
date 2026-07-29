import assert from "node:assert/strict";
import test from "node:test";
import {
  dueLabel,
  filterTodayTasks,
  getTodayCounts,
  LatestRequestGate,
  matchesTodayFilter,
  operationalDateKey,
  parseOverviewPayload,
  type TodayFilter,
  type TodayTask
} from "../lib/work/today";

function task(
  overrides: Partial<TodayTask> & Pick<TodayTask, "id" | "public_id">
): TodayTask {
  return {
    project_code: "OPS",
    project_name: "Operations",
    title: "Test task",
    description: null,
    status: "working",
    priority: "P2",
    owner: "shared",
    blocker: null,
    latest_action: null,
    verification_event_count: 1,
    pending_question_count: 0,
    due_at: null,
    completed_at: null,
    last_activity_at: "2026-07-29T15:00:00.000Z",
    ...overrides
  };
}

test("Detroit operational dates respect midnight and daylight-saving boundaries", () => {
  assert.equal(
    operationalDateKey("2026-07-30T03:59:59.000Z"),
    "2026-07-29"
  );
  assert.equal(
    operationalDateKey("2026-07-30T04:00:00.000Z"),
    "2026-07-30"
  );
  assert.equal(
    operationalDateKey("2026-03-08T04:59:59.000Z"),
    "2026-03-07"
  );
  assert.equal(
    operationalDateKey("2026-03-08T05:00:00.000Z"),
    "2026-03-08"
  );
});

test("Today counts and filters use identical terminal-safe predicates", () => {
  const now = "2026-07-30T03:45:00.000Z";
  const tasks = [
    task({
      id: "1",
      public_id: "OPS-001",
      priority: "P0",
      due_at: "2026-07-30T03:30:00.000Z",
      verification_event_count: 0
    }),
    task({
      id: "2",
      public_id: "OPS-002",
      status: "approval_required",
      pending_question_count: 1
    }),
    task({
      id: "3",
      public_id: "OPS-003",
      status: "working",
      pending_question_count: 2
    }),
    task({
      id: "4",
      public_id: "OPS-004",
      status: "blocked"
    }),
    task({
      id: "5",
      public_id: "OPS-005",
      status: "complete",
      priority: "P0",
      due_at: "2026-07-30T03:20:00.000Z",
      completed_at: "2026-07-30T03:15:00.000Z",
      verification_event_count: 0
    }),
    task({
      id: "6",
      public_id: "OPS-006",
      status: "complete",
      completed_at: "2026-07-29T03:15:00.000Z"
    }),
    task({
      id: "7",
      public_id: "OPS-007",
      status: "cancelled",
      priority: "P0",
      due_at: "2026-07-30T03:20:00.000Z",
      verification_event_count: 0
    })
  ];
  const counts = getTodayCounts(tasks, now);

  assert.deepEqual(counts, {
    open: 4,
    p0: 1,
    due: 1,
    blocked: 1,
    approval: 1,
    evidence: 1,
    complete: 1
  });
  for (const filter of Object.keys(counts) as TodayFilter[]) {
    assert.equal(
      filterTodayTasks(tasks, filter, now).length,
      counts[filter],
      `${filter} count must match its visible rows`
    );
  }
  assert.equal(matchesTodayFilter(tasks[2], "approval", now), false);
  assert.equal(matchesTodayFilter(tasks[4], "p0", now), false);
  assert.equal(matchesTodayFilter(tasks[6], "due", now), false);
});

test("invalid dates are explicit and malformed overview payloads are rejected", () => {
  assert.equal(operationalDateKey("not-a-date"), null);
  assert.equal(dueLabel("not-a-date"), "Invalid date");

  const validTask = task({ id: "1", public_id: "OPS-001" });
  const payload = {
    generatedAt: "2026-07-29T15:00:00.000Z",
    tasks: [validTask],
    events: [],
    projects: [{ code: "OPS", name: "Operations", active: true }]
  };
  assert.equal(parseOverviewPayload(payload).tasks.length, 1);
  assert.throws(
    () =>
      parseOverviewPayload({
        ...payload,
        tasks: [{ ...validTask, last_activity_at: "not-a-date" }]
      }),
    /Overview response contract invalid/
  );
  assert.throws(
    () =>
      parseOverviewPayload({
        ...payload,
        tasks: [{ ...validTask, verification_event_count: Number.NaN }]
      }),
    /Overview response contract invalid/
  );
});

test("latest request gate prevents an older refresh from winning", () => {
  const gate = new LatestRequestGate();
  const older = gate.begin();
  const newer = gate.begin();
  assert.equal(gate.isCurrent(older), false);
  assert.equal(gate.isCurrent(newer), true);
  gate.invalidate();
  assert.equal(gate.isCurrent(newer), false);
});
