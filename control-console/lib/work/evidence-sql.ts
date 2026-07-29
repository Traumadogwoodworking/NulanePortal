export function verificationEvidenceSql(alias: string) {
  if (!/^[a-z_][a-z0-9_]*$/i.test(alias)) {
    throw new Error("Invalid SQL alias for verification evidence");
  }

  return `(
    ${alias}.event_type IN ('verification', 'status_changed')
    AND NULLIF(BTRIM(${alias}.payload->>'test'), '') IS NOT NULL
    AND NULLIF(BTRIM(${alias}.payload->>'result'), '') IS NOT NULL
  )`;
}
