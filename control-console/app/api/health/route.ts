import { query } from "@lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const result = await query<{ database_time: string }>(
      "SELECT now()::text AS database_time"
    );
    return Response.json({
      status: "ready",
      database: "ready",
      databaseTime: result.rows[0].database_time,
      telegram: {
        enabled: process.env.TELEGRAM_ENABLED === "true",
        tokenPresent: Boolean(process.env.TELEGRAM_BOT_TOKEN)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return Response.json(
      {
        status: "not_ready",
        database: "unavailable",
        error: error instanceof Error ? error.message : "Unknown database error",
        timestamp: new Date().toISOString()
      },
      { status: 503 }
    );
  }
}

