import { syncCircleState } from "@lib/circle/sync";
import { closePool, ensureSchema } from "@lib/db";

try {
  await ensureSchema();
  console.log(JSON.stringify(await syncCircleState(), null, 2));
} finally {
  await closePool();
}
