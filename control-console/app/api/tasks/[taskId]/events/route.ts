import { z } from "zod";
import { addProgress, getTask } from "@lib/work/task-service";

const eventSchema = z.object({
  message: z.string().trim().min(1).max(10_000),
  actorType: z
    .enum(["matthew", "codex", "agent", "system", "telegram", "cli"])
    .default("codex"),
  details: z.record(z.string(), z.unknown()).optional()
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/tasks/[taskId]/events">
) {
  const { taskId } = await context.params;
  if (!(await getTask(taskId))) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }
  const parsed = eventSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid progress event", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  await addProgress(
    taskId,
    parsed.data.message,
    parsed.data.actorType,
    parsed.data.details ?? {}
  );
  return Response.json({ ok: true }, { status: 201 });
}

