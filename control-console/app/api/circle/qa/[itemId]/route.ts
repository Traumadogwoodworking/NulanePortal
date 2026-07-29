import { z } from "zod";
import {
  addCircleQaEvidence,
  updateCircleQaItem
} from "@lib/circle/service";
import { QA_STATUSES } from "@lib/circle/catalog";

const updateSchema = z.object({
  status: z.enum(QA_STATUSES),
  updatedBy: z.string().trim().min(1).max(120).default("matthew"),
  blocker: z.string().trim().max(2_000).optional().nullable()
});

const evidenceSchema = z.object({
  evidenceType: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(3).max(5_000),
  buildDevice: z.string().trim().max(500).optional(),
  testUser: z.string().trim().max(500).optional(),
  loadVin: z.string().trim().max(500).optional(),
  screenshotPath: z.string().trim().max(2_000).optional(),
  reportPath: z.string().trim().max(2_000).optional(),
  correlationId: z.string().trim().max(500).optional(),
  backendRecord: z.string().trim().max(2_000).optional(),
  portalState: z.string().trim().max(2_000).optional(),
  tester: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(5_000).optional()
});

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/circle/qa/[itemId]">
) {
  const { itemId } = await context.params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid QA update", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    return Response.json({
      item: await updateCircleQaItem({ itemId, ...parsed.data })
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "QA update failed" },
      { status: 400 }
    );
  }
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/circle/qa/[itemId]">
) {
  const { itemId } = await context.params;
  const parsed = evidenceSchema.safeParse(await request.json());
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid QA evidence", details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  try {
    return Response.json(
      {
        evidence: await addCircleQaEvidence({ itemId, ...parsed.data })
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Evidence failed" },
      { status: 400 }
    );
  }
}
