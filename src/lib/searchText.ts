export function splitSearchTokens(value: string): string[] {
  return value
    .trim()
    .split(/[^A-Za-z0-9]+/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeSearchText(value: string | null | undefined): string {
  return (value ?? "").toString().trim().replace(/\s+/g, " ").toLowerCase();
}

export function matchesAnySearchQuery(haystack: string, query: string): boolean {
  const tokens = splitSearchTokens(query);
  if (tokens.length === 0) return true;
  const normalizedHaystack = normalizeSearchText(haystack);
  return tokens.some((token) => normalizedHaystack.includes(token.toLowerCase()));
}
