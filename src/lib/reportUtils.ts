import type {
  ReportDamageApiRow,
  ReportSeverity,
  RsaReportApiRow,
} from "@/lib/types";

const severityPriority: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const USER_PALETTE = [
  { bg: 'bg-slate-100 dark:bg-slate-900', text: 'text-slate-700 dark:text-slate-200', border: 'border-slate-200 dark:border-slate-800', circle: 'bg-slate-500 dark:bg-slate-400' },
  { bg: 'bg-emerald-100 dark:bg-emerald-900', text: 'text-emerald-700 dark:text-emerald-200', border: 'border-emerald-200 dark:border-emerald-800', circle: 'bg-emerald-500 dark:bg-emerald-400' },
  { bg: 'bg-orange-100 dark:bg-orange-900', text: 'text-orange-700 dark:text-orange-200', border: 'border-orange-200 dark:border-orange-800', circle: 'bg-orange-500 dark:bg-orange-400' },
  { bg: 'bg-rose-100 dark:bg-rose-900', text: 'text-rose-700 dark:text-rose-200', border: 'border-rose-200 dark:border-rose-800', circle: 'bg-rose-500 dark:bg-rose-400' },
  { bg: 'bg-amber-100 dark:bg-amber-900', text: 'text-amber-700 dark:text-amber-200', border: 'border-amber-200 dark:border-amber-800', circle: 'bg-amber-500 dark:bg-amber-400' },
  { bg: 'bg-stone-100 dark:bg-stone-900', text: 'text-stone-700 dark:text-stone-200', border: 'border-stone-200 dark:border-stone-800', circle: 'bg-stone-500 dark:bg-stone-400' },
  { bg: 'bg-zinc-100 dark:bg-zinc-900', text: 'text-zinc-700 dark:text-zinc-200', border: 'border-zinc-200 dark:border-zinc-800', circle: 'bg-zinc-500 dark:bg-zinc-400' },
];

export function getUserColor(email?: string) {
  if (!email) return USER_PALETTE[6];
  const hash = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return USER_PALETTE[hash % USER_PALETTE.length];
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function stripFacilitySuffix(value: string | null | undefined): string {
  const normalized = (value ?? "").toString().trim().replace(/\s+/g, " ");
  if (!normalized) {
    return "";
  }
  return normalized.replace(/\.(?:inc|incs)\.?$/i, "").trim();
}

export function deriveReportSeverity(report: ReportDamageApiRow): ReportSeverity {
  const entries = Array.isArray(report.damage_entries)
    ? report.damage_entries
    : Array.isArray(report.damage_summary)
    ? report.damage_summary
    : [];
  let bestSeverity: ReportSeverity = "low";
  let bestScore = 0;
  entries.forEach((entry) => {
    const severity = (entry?.severity || "").toString().toLowerCase();
    const score = severityPriority[severity] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestSeverity = severity || "low";
    }
  });
  return bestSeverity;
}

export function deriveMostMajorDamage(report: ReportDamageApiRow): string {
  const entries = Array.isArray(report.damage_entries) ? report.damage_entries : [];
  if (entries.length === 0) return "No damage recorded";

  let bestEntry = entries[0];
  let bestScore = severityPriority[(bestEntry.severity || "").toString().toLowerCase()] ?? 0;

  entries.forEach((entry) => {
    const score = severityPriority[(entry.severity || "").toString().toLowerCase()] ?? 0;
    if (score > bestScore) {
      bestScore = score;
      bestEntry = entry;
    }
  });

  const type = bestEntry.damage_type || "General Damage";
  const area = bestEntry.damage_area || "";
  return area ? `${area}: ${type}` : type;
}

function extractLocationCandidate(
  report: ReportDamageApiRow | RsaReportApiRow,
  path: string[]
): string {
  let current: unknown = report;
  for (const segment of path) {
    if (!current || typeof current !== "object") {
      return "";
    }
    current = (current as Record<string, unknown>)[segment];
  }
  return current && typeof current === "string" ? current : "";
}

const damageLocationPaths = [
  ["overview", "navigation"],
  ["overview", "navigation_text"],
  ["overview", "navigationText"],
  ["overview", "navigationInstructions"],
  ["payload", "navigation"],
  ["payload", "navigationText"],
  ["payload", "location", "navigation"],
  ["payload", "location", "navigationText"],
  ["report", "navigation"],
  ["report", "navigationText"],
  ["report", "location", "navigation"],
  ["report", "location", "navigationText"],
  ["railcar_scan", "navigation"],
  ["railcar_scan", "navigationText"],
  ["railcar_scan", "location", "navigation"],
  ["railcar_scan", "location", "navigationText"],
];

export function resolveDamageReportLocationName(report: ReportDamageApiRow): string {
  if (!report) return "";
  for (const path of damageLocationPaths) {
    const candidate = extractLocationCandidate(report, path);
    if (candidate.trim()) {
      return stripFacilitySuffix(candidate);
    }
  }
  const locationLabel = report.location?.location_label || "";
  const locationName = report.location?.location_name || "";
  if (locationLabel.trim()) {
    return stripFacilitySuffix(locationLabel);
  }
  if (locationName.trim()) {
    return stripFacilitySuffix(locationName);
  }
  return "Unknown facility";
}

export function resolveRsaFacilityLabel(report: RsaReportApiRow): string {
  if (report?.facility) {
    return stripFacilitySuffix(report.facility);
  }
  if (report?.track) {
    return `Track ${report.track}`;
  }
  if (report?.spot) {
    return `Spot ${report.spot}`;
  }
  return "RSA facility";
}

export function slugForFacilityLabel(label: string): string {
  const normalized = stripFacilitySuffix(label);
  if (!normalized) {
    return "unknown";
  }
  return slugify(normalized);
}

export function resolveCarDisplayInfo(car: unknown) {
  const c = car as Record<string, unknown>;
  const allVins: string[] = [];
  const deckVinsMap: Record<string, string[]> = {};
  
  if (c.decks && typeof c.decks === "object") {
    Object.entries(c.decks).forEach(([deckKey, deckVins]) => {
      const vinsForDeck: string[] = [];
      if (Array.isArray(deckVins)) {
        deckVins.forEach((v: unknown) => {
          const vinVal = (v && typeof v === "object" && "vin" in v ? String((v as {vin: unknown}).vin) : String(v)).trim().toUpperCase();
          if (vinVal && vinVal !== "N/A" && vinVal !== "UNDEFINED") {
            allVins.push(vinVal);
            vinsForDeck.push(vinVal);
          }
        });
      }
      if (vinsForDeck.length > 0) {
        deckVinsMap[deckKey] = vinsForDeck;
      }
    });
  }

  const railcarNum = (c.railCarNumber || c.rail_car_number || c.car_id || "").toString().toUpperCase();
  
  const primaryId = allVins.length === 1 
    ? allVins[0] 
    : (railcarNum || "No ID");
  
  return {
      primaryId,
      vinCount: allVins.length,
      allVins,
      deckVinsMap,
      hasMultiple: allVins.length > 1,
      railcarId: railcarNum,
      decks: Object.keys(deckVinsMap).sort(),
      isUnverified: allVins.length === 0
  };
}
