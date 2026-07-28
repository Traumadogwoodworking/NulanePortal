import { closePool, ensureSchema } from "@lib/db";

try {
  await ensureSchema();
  console.log("Nulane Work schema is ready");
} finally {
  await closePool();
}

