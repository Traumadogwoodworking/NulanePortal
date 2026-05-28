const SEVERITY_THEME: Record<string, { bg: string; fg: string; border: string }> = {
  "1": { bg: "bg-emerald-500", fg: "text-white", border: "border-emerald-600" },
  "2": { bg: "bg-amber-400", fg: "text-slate-950", border: "border-amber-500" },
  "3": { bg: "bg-orange-500", fg: "text-white", border: "border-orange-600" },
  "4": { bg: "bg-red-500", fg: "text-white", border: "border-red-600" },
  "5": { bg: "bg-rose-900", fg: "text-white", border: "border-rose-950" },
  "6": { bg: "bg-slate-500", fg: "text-white", border: "border-slate-600" },
};

function normalizeSeverityCode(value?: string | number | null): string {
  if (value === undefined || value === null) {
    return "";
  }
  const normalized = `${value}`.trim().toLowerCase();
  if (!normalized) {
    return "";
  }
  return normalized;
}

export function getSeverityTheme(value?: string | number | null) {
  const code = normalizeSeverityCode(value);
  return SEVERITY_THEME[code] ?? { bg: "bg-slate-200", fg: "text-slate-900", border: "border-slate-300" };
}

export function severityPillClass(value?: string | number | null) {
  const theme = getSeverityTheme(value);
  return `${theme.bg} ${theme.fg} border ${theme.border}`;
}

export function selectedRowStrokeClass(isSelected: boolean) {
  return isSelected ? "bg-slate-50" : "";
}
