import { getOverview } from "@lib/work/task-service";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getOverview());
}

