export const TASK_STATUSES = [
  "queued",
  "interviewing",
  "ready",
  "working",
  "verifying",
  "approval_required",
  "blocked",
  "failed",
  "paused",
  "cancelled",
  "complete"
] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = "P0" | "P1" | "P2" | "P3";
export type TaskOwner = "matthew" | "codex" | "agent" | "external" | "shared";

export interface WorkTask {
  id: string;
  public_id: string;
  project_id: string;
  project_code: string;
  project_name: string;
  repository_id: string | null;
  repository_name: string | null;
  repository_path: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  owner: TaskOwner;
  allowed_scope: string | null;
  acceptance_criteria: unknown[];
  required_verification: unknown[];
  blocker: string | null;
  due_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_activity_at: string;
  created_at: string;
  updated_at: string;
}

export interface WorkQuestion {
  id: string;
  task_id: string;
  sequence: number;
  field_key: string;
  prompt: string;
  recommended_answer: string | null;
  status: "pending" | "answered" | "skipped" | "cancelled";
  answer: string | null;
  asked_at: string;
  answered_at: string | null;
}

export interface TaskEvent {
  id: string;
  task_id: string;
  public_id: string;
  event_type: string;
  actor_type: string;
  actor_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}
