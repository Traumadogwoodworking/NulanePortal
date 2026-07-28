import { Bot, InlineKeyboard } from "grammy";
import { closePool, ensureSchema, query, withTransaction } from "@lib/db";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (process.env.TELEGRAM_ENABLED !== "true") {
  throw new Error("TELEGRAM_ENABLED must be true to start the dispatcher");
}
if (!token) {
  throw new Error("TELEGRAM_BOT_TOKEN is required");
}

await ensureSchema();
const bot = new Bot(token);
const intervalMs = Number(process.env.DISPATCH_INTERVAL_MS ?? 15_000);
const staleMinutes = Number(process.env.STALE_WORK_MINUTES ?? 45);
let stopping = false;

async function enqueueStaleWorkAlerts() {
  await withTransaction(async (client) => {
    const stale = await client.query<{
      id: string;
      public_id: string;
      title: string;
      last_activity_at: string;
    }>(
      `SELECT id, public_id, title, last_activity_at
       FROM tasks t
       WHERE status = 'working'
         AND last_activity_at < now() - make_interval(mins => $1::integer)
         AND NOT EXISTS (
           SELECT 1
           FROM task_events e
           WHERE e.task_id = t.id
             AND e.event_type = 'stale_work_alerted'
             AND e.created_at > t.last_activity_at
         )
       FOR UPDATE SKIP LOCKED`,
      [staleMinutes]
    );

    for (const task of stale.rows) {
      await client.query(
        `INSERT INTO task_events (task_id, event_type, actor_type, payload)
         VALUES (
           $1,
           'stale_work_alerted',
           'system',
           jsonb_build_object('lastActivityAt', $2::text, 'thresholdMinutes', $3::integer)
         )`,
        [task.id, task.last_activity_at, staleMinutes]
      );
      await client.query(
        `INSERT INTO notification_outbox (task_id, kind, body, action_payload)
         VALUES ($1, 'stale_work', $2, $3::jsonb)`,
        [
          task.id,
          `${task.public_id} has been working without a progress update for ${staleMinutes} minutes.\n\n${task.title}`,
          JSON.stringify({ taskId: task.public_id })
        ]
      );
    }
  });
}

async function claimNotification() {
  return withTransaction(async (client) => {
    const result = await client.query<{
      id: string;
      body: string;
      kind: string;
      action_payload: Record<string, string>;
      telegram_chat_id: string;
    }>(
      `SELECT
         n.id::text,
         n.body,
         n.kind,
         n.action_payload,
         o.telegram_chat_id::text
       FROM notification_outbox n
       JOIN operators o
         ON o.active = true
        AND o.telegram_chat_id IS NOT NULL
       WHERE n.status IN ('pending', 'failed')
         AND n.available_at <= now()
         AND (n.operator_id IS NULL OR n.operator_id = o.id)
       ORDER BY n.id
       LIMIT 1
       FOR UPDATE OF n SKIP LOCKED`
    );
    const item = result.rows[0];
    if (!item) {
      return null;
    }
    await client.query(
      `UPDATE notification_outbox
       SET status = 'sending', attempts = attempts + 1
       WHERE id = $1`,
      [item.id]
    );
    return item;
  });
}

async function deliverNotification() {
  const item = await claimNotification();
  if (!item) {
    return false;
  }

  try {
    const keyboard = new InlineKeyboard();
    if (item.action_payload.taskId) {
      keyboard
        .text("Open status", `status:${item.action_payload.taskId}`)
        .text("Pause", `pause-public:${item.action_payload.taskId}`);
    }
    await bot.api.sendMessage(Number(item.telegram_chat_id), item.body, {
      reply_markup: keyboard.inline_keyboard.length ? keyboard : undefined
    });
    await query(
      `UPDATE notification_outbox
       SET status = 'sent', sent_at = now(), last_error = NULL
       WHERE id = $1`,
      [item.id]
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await query(
      `UPDATE notification_outbox
       SET status = 'failed',
           last_error = $2,
           available_at = now() + make_interval(secs => LEAST(300, attempts * 15))
       WHERE id = $1`,
      [item.id, message]
    );
    console.error(`Notification ${item.id} failed`, message);
  }
  return true;
}

async function runCycle() {
  await enqueueStaleWorkAlerts();
  for (let index = 0; index < 20; index += 1) {
    if (!(await deliverNotification())) {
      break;
    }
  }
}

process.once("SIGINT", () => {
  stopping = true;
});
process.once("SIGTERM", () => {
  stopping = true;
});

console.log("Nulane Work dispatcher started");
while (!stopping) {
  try {
    await runCycle();
  } catch (error) {
    console.error("Dispatcher cycle failed", error);
  }
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
}
await closePool();
