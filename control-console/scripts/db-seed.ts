import { closePool, ensureSchema, withTransaction } from "@lib/db";

try {
  await ensureSchema();
  await withTransaction(async (client) => {
    const operations = await client.query<{ id: string }>(
      `INSERT INTO projects (code, name, description, next_task_number)
       VALUES (
         'OPS',
         'Nulane Operations',
         'Durable work loop, communication, and control-plane foundation',
         2
       )
       ON CONFLICT (code)
       DO UPDATE SET updated_at = now()
       RETURNING id`
    );

    await client.query(
      `INSERT INTO projects (code, name, description, repository_path)
       VALUES (
         'CIR',
         'Circle',
         'Circle Logistics mobile, portal, PDF, and API work',
         '/Users/home/Desktop/Codex/apps/docudent-circle'
       )
       ON CONFLICT (code)
       DO UPDATE SET
         repository_path = EXCLUDED.repository_path,
         updated_at = now()`
    );

    const taskResult = await client.query<{ id: string }>(
      `INSERT INTO tasks (
         public_id,
         project_id,
         title,
         description,
         status,
         priority,
         owner,
         blocker,
         allowed_scope
       )
       VALUES (
         'OPS-001',
         $1,
         'Connect the private Telegram work loop',
         'Run the custom Telegram adapter with one-user pairing and durable task context.',
         'blocked',
         'P0',
         'shared',
         'A rotated Telegram bot token and one-time pairing code must be installed outside the repository.',
         'Custom Telegram Bot API adapter only. OpenClaw is prohibited.'
       )
       ON CONFLICT (public_id)
       DO UPDATE SET
         description = EXCLUDED.description,
         allowed_scope = EXCLUDED.allowed_scope,
         updated_at = now()
       RETURNING id`,
      [operations.rows[0].id]
    );

    await client.query(
      `INSERT INTO task_events (task_id, event_type, actor_type, payload)
       SELECT
         $1,
         'task_created',
         'system',
         '{"seeded":true,"reason":"first control-plane milestone"}'::jsonb
       WHERE NOT EXISTS (
         SELECT 1 FROM task_events WHERE task_id = $1
       )`,
      [taskResult.rows[0].id]
    );
  });
  console.log("Nulane Work seed data is ready");
} finally {
  await closePool();
}

