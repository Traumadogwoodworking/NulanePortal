import { getCirclePilot } from "@lib/circle/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getCirclePilot());
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Circle pilot unavailable"
      },
      { status: 503 }
    );
  }
}
