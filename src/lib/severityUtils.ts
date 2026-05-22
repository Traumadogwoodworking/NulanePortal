const SEVERITY_PRIORITY: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function normalizeSeverityKey(value?: string | number | null): string {
  if (value === undefined || value === null) {
    return "unknown";
  }
  if (typeof value === "number") {
    return `${value}`;
  }
  const normalized = value.toLowerCase().trim();
  return normalized || "unknown";
}

export function severityLabel(value?: string | number | null): string {
  const key = normalizeSeverityKey(value);
  if (key === "unknown") {
    return "Unknown";
  }
  return key.charAt(0).toUpperCase() + key.slice(1);
}

export function severityTone(value?: string | number | null): "positive" | "warning" | "danger" | "neutral" {
  const key = normalizeSeverityKey(value);
  if (key === "high") return "danger";
  if (key === "medium") return "warning";
  if (key === "low") return "positive";
  return "neutral";
}

export function severityPriority(value?: string | number | null): number {
  const key = normalizeSeverityKey(value);
  return SEVERITY_PRIORITY[key] ?? 0;
}
