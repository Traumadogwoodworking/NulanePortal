import { closePool, ensureSchema } from "@lib/db";
import { syncServiceMonitors } from "@lib/services/sync";

try {
  await ensureSchema();
  console.log(JSON.stringify(await syncServiceMonitors(), null, 2));
} finally {
  await closePool();
}
