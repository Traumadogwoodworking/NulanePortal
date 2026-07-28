import { z } from "zod";
import { createTask, listTasks } from "@lib/work/task-service";

export const dynamic = "force-dynamic";

const createTaskSchema = z.object({
  projectCode: z.string().trim().min(2).max(8),
  title: z.string().trim().min(3).max(240),
  description: z.string().trim().max(5_000).optional(),
  priority: z.enum(["P0", "P1", "P2", "P3"]).optional(),
  owner: z
    .enum(["matthew", "codex", "agent", "external", "shared"])
    .optional(),
  status: z
    .enum([
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
    .optional(),
  allowedScope: z.string().trim().max(5_000).optional()
});

export async function GET() {
  return Response.json({ tasks: await listTasks() });
}

export async function POST(request: Request) {
  const parsed = createTaskSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid task", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const task = await createTask(parsed.data);
    return Response.json({ task }, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Task creation failed" },
      { status: 400 }
    );
  }
}

