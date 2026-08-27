export function formatFacilityDisplayName(value: string | null | undefined): string {
  const normalized = (value ?? "").toString().trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  return normalized;
}

export function formatOrganizationDisplayName(
  value: string | null | undefined,
): string {
  const normalized = (value ?? "").toString().trim().replace(/\s+/g, " ");
  return normalized;
}
