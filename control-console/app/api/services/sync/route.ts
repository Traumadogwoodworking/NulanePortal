import { z } from "zod";
import { syncServiceMonitors } from "@lib/services/sync";

const bodySchema = z.object({
  slugs: z.array(z.string().regex(/^[a-z0-9][a-z0-9-]{1,79}$/)).max(20).optional()
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid monitor list" }, { status: 400 });
  }
  try {
    return Response.json(await syncServiceMonitors(parsed.data.slugs));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Service sync failed" },
      { status: 503 }
    );
  }
}
