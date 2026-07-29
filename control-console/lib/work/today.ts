import { z } from "zod";
import { TASK_STATUSES } from "@lib/work/types";

export const OPERATIONAL_TIME_ZONE = "America/Detroit";

export type TodayFilter =
  | "open"
  | "p0"
  | "due"
  | "blocked"
  | "approval"
  | "evidence"
  | "complete";

const prioritySchema = z.enum(["P0", "P1", "P2", "P3"]);
const timestampSchema = z.string().refine(
  (value) => Number.isFinite(Date.parse(value)),
  "Expected a valid timestamp"
);
const nullableTimestampSchema = timestampSchema.nullable();

const todayTaskSchema = z.object({
  id: z.string().min(1),
  public_id: z.string().min(1),
  project_code: z.string().min(1),
  project_name: z.string().min(1),
  title: z.string().min(1),
  description: z.string().nullable(),
  status: z.enum(TASK_STATUSES),
  priority: prioritySchema,
  owner: z.string().min(1),
  blocker: z.string().nullable(),
  latest_action: z.string().nullable(),
  verification_event_count: z.number().int().nonnegative(),
  pending_question_count: z.number().int().nonnegative(),
  due_at: nullableTimestampSchema,
  completed_at: nullableTimestampSchema,
  last_activity_at: timestampSchema
});

const overviewSchema = z.object({
  generatedAt: timestampSchema,
  tasks: z.array(todayTaskSchema),
  events: z.array(
    z.object({
      id: z.string().min(1),
      public_id: z.string().min(1),
      event_type: z.string().min(1),
      actor_type: z.string().min(1),
      payload: z.record(z.string(), z.unknown()),
      created_at: timestampSchema
    })
  ),
  projects: z.array(
    z.object({
      code: z.string().min(1),
      name: z.string().min(1),
      active: z.boolean()
    })
  )
});

export type TodayTask = z.infer<typeof todayTaskSchema>;
export type WorkOverview = z.infer<typeof overviewSchema>;

function validDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

const operationalDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: OPERATIONAL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const dueDateFormatter = new Intl.DateTimeFormat("en-US", {
  timeZone: OPERATIONAL_TIME_ZONE,
  month: "short",
  day: "numeric"
});

export function operationalDateKey(value: string | Date) {
  const date = validDate(value);
  if (!date) return null;
  const parts = Object.fromEntries(
    operationalDateFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatOperationalTimestamp(value: string | Date) {
  const date = validDate(value);
  if (!date) return "Invalid timestamp";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: OPERATIONAL_TIME_ZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(date);
}

export function dueLabel(
  value: string | null,
  now: string | Date = new Date()
) {
  if (!value) return "—";
  const date = validDate(value);
  if (!date) return "Invalid date";
  if (operationalDateKey(date) === operationalDateKey(now)) return "Today";
  return dueDateFormatter.format(date);
}

function isTerminal(task: TodayTask) {
  return task.status === "complete" || task.status === "cancelled";
}

export function isDueToday(
  task: TodayTask,
  now: string | Date = new Date()
) {
  return Boolean(
    !isTerminal(task) &&
      task.due_at &&
      operationalDateKey(task.due_at) === operationalDateKey(now)
  );
}

export function matchesTodayFilter(
  task: TodayTask,
  filter: TodayFilter,
  now: string | Date = new Date()
) {
  const active = !isTerminal(task);
  if (filter === "open") return active;
  if (filter === "p0") return active && task.priority === "P0";
  if (filter === "due") return isDueToday(task, now);
  if (filter === "blocked") {
    return task.status === "blocked" || task.status === "failed";
  }
  if (filter === "approval") {
    return active && task.status === "approval_required";
  }
  if (filter === "evidence") {
    return active && task.verification_event_count === 0;
  }
  return (
    task.status === "complete" &&
    Boolean(
      task.completed_at &&
        operationalDateKey(task.completed_at) === operationalDateKey(now)
    )
  );
}

function safeTimestamp(value: string) {
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : 0;
}

const priorityOrder: Record<TodayTask["priority"], number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3
};

export function filterTodayTasks(
  tasks: TodayTask[],
  filter: TodayFilter,
  now: string | Date = new Date()
) {
  return tasks
    .filter((task) => matchesTodayFilter(task, filter, now))
    .sort((a, b) => {
      const priority = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priority !== 0) return priority;
      const aBlocked = a.status === "blocked" || a.status === "failed";
      const bBlocked = b.status === "blocked" || b.status === "failed";
      if (aBlocked !== bBlocked) return aBlocked ? -1 : 1;
      return safeTimestamp(b.last_activity_at) - safeTimestamp(a.last_activity_at);
    });
}

export function getTodayCounts(
  tasks: TodayTask[],
  now: string | Date = new Date()
) {
  const count = (filter: TodayFilter) =>
    tasks.filter((task) => matchesTodayFilter(task, filter, now)).length;
  return {
    open: count("open"),
    p0: count("p0"),
    due: count("due"),
    blocked: count("blocked"),
    approval: count("approval"),
    evidence: count("evidence"),
    complete: count("complete")
  };
}

export function parseOverviewPayload(payload: unknown): WorkOverview {
  const parsed = overviewSchema.safeParse(payload);
  if (parsed.success) return parsed.data;
  const failures = parsed.error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(".") || "payload"}: ${issue.message}`)
    .join("; ");
  throw new Error(`Overview response contract invalid. ${failures}`);
}

export class LatestRequestGate {
  private generation = 0;

  begin() {
    this.generation += 1;
    return this.generation;
  }

  isCurrent(requestId: number) {
    return requestId === this.generation;
  }

  invalidate() {
    this.generation += 1;
  }
}
