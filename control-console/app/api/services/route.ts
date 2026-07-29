import { getServicesOverview } from "@lib/services/service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await getServicesOverview());
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Service status unavailable" },
      { status: 503 }
    );
  }
}
