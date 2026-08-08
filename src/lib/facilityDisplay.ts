export function formatFacilityDisplayName(value: string | null | undefined): string {
  const normalized = (value ?? "").toString().trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  return normalized
    .replace(/^awct\s*(?:\.\s*inc|inc)\s*[-–—:|]\s*/i, "")
    .trim() || normalized;
}
