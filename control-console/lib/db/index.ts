import fs from "node:fs/promises";
import path from "node:path";
import { Pool, type PoolClient, type QueryResultRow } from "pg";

declare global {
  var __nulaneWorkPool: Pool | undefined;
}

function databaseUrl() {
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error("DATABASE_URL is required");
  }
  return value;
}

export function getPool() {
  if (!globalThis.__nulaneWorkPool) {
    globalThis.__nulaneWorkPool = new Pool({
      connectionString: databaseUrl(),
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000
    });
  }
  return globalThis.__nulaneWorkPool;
}

export async function query<T extends QueryResultRow>(
  text: string,
  values: unknown[] = []
) {
  return getPool().query<T>(text, values);
}

export async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>
) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function ensureSchema() {
  const schemaPath = path.join(process.cwd(), "db", "schema.sql");
  const sql = await fs.readFile(schemaPath, "utf8");
  await getPool().query(sql);
}

export async function closePool() {
  if (globalThis.__nulaneWorkPool) {
    const pool = globalThis.__nulaneWorkPool;
    globalThis.__nulaneWorkPool = undefined;
    await pool.end();
  }
}
