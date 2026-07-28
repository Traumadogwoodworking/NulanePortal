import { z } from "zod";
import { answerQuestion } from "@lib/work/task-service";

const answerSchema = z.object({
  answer: z.string().trim().min(1).max(20_000)
});

export async function POST(
  request: Request,
  context: RouteContext<"/api/tasks/[taskId]/answers">
) {
  const { taskId } = await context.params;
  const parsed = answerSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid answer", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    const result = await answerQuestion({
      publicId: taskId,
      answer: parsed.data.answer,
      actorType: "matthew"
    });
    return Response.json(result, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Answer failed" },
      { status: 400 }
    );
  }
}

