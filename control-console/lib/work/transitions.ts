import type { TaskStatus } from "@lib/work/types";

const TERMINAL_TASK_STATUSES = new Set<TaskStatus>(["complete", "cancelled"]);

export function isTerminalTaskStatus(status: string) {
  return TERMINAL_TASK_STATUSES.has(status as TaskStatus);
}

export function assertTaskTransitionAllowed(
  current: TaskStatus,
  next: TaskStatus
) {
  if (TERMINAL_TASK_STATUSES.has(current) && current !== next) {
    throw new Error(
      `Task is ${current} and cannot transition to ${next}; create or reopen work through an explicit operator workflow.`
    );
  }
}
