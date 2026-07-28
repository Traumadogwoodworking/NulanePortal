import { z } from "zod";
import { query } from "@lib/db";
import {
  getPendingQuestion,
  getTask,
  transitionTask
} from "@lib/work/task-service";
import type { TaskEvent, WorkQuestion } from "@lib/work/types";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  status: z.enum([
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
  ])
});

export async function GET(
  _request: Request,
  context: RouteContext<"/api/tasks/[taskId]">
) {
  const { taskId } = await context.params;
  const task = await getTask(taskId);
  if (!task) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }
  const [questions, events, pendingQuestion] = await Promise.all([
    query<WorkQuestion>(
      `SELECT * FROM questions WHERE task_id = $1 ORDER BY sequence`,
      [task.id]
    ),
    query<TaskEvent>(
      `SELECT e.*, $2::text AS public_id
       FROM task_events e
       WHERE e.task_id = $1
       ORDER BY e.created_at DESC`,
      [task.id, task.public_id]
    ),
    getPendingQuestion(task.public_id)
  ]);

  return Response.json({
    task,
    questions: questions.rows,
    events: events.rows,
    pendingQuestion
  });
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/tasks/[taskId]">
) {
  const { taskId } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid task update", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const task = await transitionTask(
      taskId,
      parsed.data.status,
      "matthew",
      { source: "dashboard" }
    );
    return Response.json({ task });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Task update failed" },
      { status: 400 }
    );
  }
}

