import { z } from "zod";
import { updateCirclePlanItem } from "@lib/circle/service";

const updateSchema = z.object({
  status: z.enum(["planned", "working", "blocked", "complete", "skipped"])
});

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/circle/plan/[itemId]">
) {
  const { itemId } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid plan update", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    return Response.json({
      item: await updateCirclePlanItem({ itemId, status: parsed.data.status })
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Plan update failed" },
      { status: 400 }
    );
  }
}
