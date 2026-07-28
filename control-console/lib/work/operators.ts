import crypto from "node:crypto";
import { query, withTransaction } from "@lib/db";

export interface Operator {
  id: string;
  display_name: string;
  telegram_user_id: string | null;
  telegram_chat_id: string | null;
  role: "owner" | "operator" | "viewer";
  active: boolean;
  active_task_id: string | null;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return (
    leftBuffer.length === rightBuffer.length &&
    crypto.timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export async function getOperatorByTelegramId(telegramUserId: number) {
  const result = await query<Operator>(
    `SELECT
       id,
       display_name,
       telegram_user_id::text,
       telegram_chat_id::text,
       role,
       active,
       active_task_id
     FROM operators
     WHERE telegram_user_id = $1 AND active = true
     LIMIT 1`,
    [telegramUserId]
  );
  return result.rows[0] ?? null;
}

export async function getOwner() {
  const result = await query<Operator>(
    `SELECT
       id,
       display_name,
       telegram_user_id::text,
       telegram_chat_id::text,
       role,
       active,
       active_task_id
     FROM operators
     WHERE role = 'owner' AND active = true
     ORDER BY approved_at NULLS LAST, created_at
     LIMIT 1`
  );
  return result.rows[0] ?? null;
}

export async function pairOwner(input: {
  telegramUserId: number;
  telegramChatId: number;
  displayName: string;
  pairingCode: string;
}) {
  const expected = process.env.TELEGRAM_PAIRING_CODE;
  if (!expected || expected.length < 12) {
    throw new Error("Telegram pairing is not configured");
  }
  if (!safeEqual(input.pairingCode, expected)) {
    throw new Error("Invalid pairing code");
  }

  return withTransaction(async (client) => {
    const paired = await client.query<{ count: string }>(
      `SELECT count(*)::text AS count
       FROM operators
       WHERE active = true AND telegram_user_id IS NOT NULL`
    );
    if (Number(paired.rows[0].count) > 0) {
      const existing = await client.query<Operator>(
        `SELECT
           id,
           display_name,
           telegram_user_id::text,
           telegram_chat_id::text,
           role,
           active,
           active_task_id
         FROM operators
         WHERE telegram_user_id = $1 AND active = true`,
        [input.telegramUserId]
      );
      if (existing.rows[0]) {
        return existing.rows[0];
      }
      throw new Error("An owner is already paired");
    }

    const result = await client.query<Operator>(
      `INSERT INTO operators (
         display_name,
         telegram_user_id,
         telegram_chat_id,
         role,
         active,
         approved_at
       )
       VALUES ($1, $2, $3, 'owner', true, now())
       RETURNING
         id,
         display_name,
         telegram_user_id::text,
         telegram_chat_id::text,
         role,
         active,
         active_task_id`,
      [
        input.displayName || "Matthew",
        input.telegramUserId,
        input.telegramChatId
      ]
    );
    return result.rows[0];
  });
}

export async function setActiveTask(operatorId: string, publicId: string) {
  const result = await query<Operator>(
    `UPDATE operators o
     SET active_task_id = t.id, updated_at = now()
     FROM tasks t
     WHERE o.id = $1 AND t.public_id = $2
     RETURNING
       o.id,
       o.display_name,
       o.telegram_user_id::text,
       o.telegram_chat_id::text,
       o.role,
       o.active,
       o.active_task_id`,
    [operatorId, publicId.toUpperCase()]
  );
  if (!result.rows[0]) {
    throw new Error(`Task ${publicId} was not found`);
  }
  return result.rows[0];
}

export async function getActiveTaskPublicId(operatorId: string) {
  const result = await query<{ public_id: string }>(
    `SELECT t.public_id
     FROM operators o
     JOIN tasks t ON t.id = o.active_task_id
     WHERE o.id = $1`,
    [operatorId]
  );
  return result.rows[0]?.public_id ?? null;
}

