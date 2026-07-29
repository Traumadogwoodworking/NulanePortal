import { getInspectionTracOperations } from "@lib/inspection-trac/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getInspectionTracOperations());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Inspection Trac operations unavailable" },
      { status: 503 }
    );
  }
}
