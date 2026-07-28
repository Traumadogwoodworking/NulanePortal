import { z } from "zod";
import {
  createManualQuestion,
  getTask,
  startInterview
} from "@lib/work/task-service";

const questionSchema = z.object({
  prompt: z.string().trim().min(3).max(10_000).optional(),
  recommendedAnswer: z.string().trim().max(10_000).optional(),
  startStandardInterview: z.boolean().optional()
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/tasks/[taskId]/questions">
) {
  const { taskId } = await context.params;
  if (!(await getTask(taskId))) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }
  const parsed = questionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid question", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  if (parsed.data.startStandardInterview) {
    const question = await startInterview(taskId, "matthew");
    return Response.json({ question }, { status: 201 });
  }
  if (!parsed.data.prompt) {
    return Response.json(
      { error: "prompt or startStandardInterview is required" },
      { status: 400 }
    );
  }
  const question = await createManualQuestion({
    publicId: taskId,
    prompt: parsed.data.prompt,
    recommendedAnswer: parsed.data.recommendedAnswer,
    actorType: "matthew"
  });
  return Response.json({ question }, { status: 201 });
}

