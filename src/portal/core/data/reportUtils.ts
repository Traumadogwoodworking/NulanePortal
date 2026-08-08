import type {
  PortalSessionLocation,
  ReportDamageApiRow,
  ReportSeverity,
  RsaReportApiRow,
} from "@/lib/types";

const severityPriority: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function severityScore(value: unknown): number {
  const normalized = (value ?? "").toString().trim().toLowerCase();
  if (!normalized) return 0;
  const numeric = Number(normalized);
  if (Number.isFinite(numeric)) return numeric;
  return severityPriority[normalized] ?? 0;
}

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

function normalizeFacilityDisplayValue(value: string | null | undefined): string {
  const normalized = stripFacilitySuffix(value);
  const lower = normalized.toLowerCase();
  if (
    !normalized ||
    lower === "unknown" ||
    lower === "unknown facility" ||
    lower === "unavailable" ||
    lower === "n/a" ||
    lower === "na" ||
    lower === "null" ||
    lower === "undefined"
  ) {
    return "Other";
  }
  return normalized;
}

export function deriveReportSeverity(report: ReportDamageApiRow): ReportSeverity {
  const reportRecord = report as unknown as Record<string, unknown>;
  const damageSummaryRecord =
    reportRecord.damage_summary &&
    typeof reportRecord.damage_summary === "object" &&
    !Array.isArray(reportRecord.damage_summary)
      ? (reportRecord.damage_summary as Record<string, unknown>)
      : null;
  const entries = Array.isArray(report.damage_entries)
    ? report.damage_entries
    : Array.isArray(report.damage_summary)
    ? report.damage_summary
    : [];
  const directSeverity =
    reportRecord.severity ??
    damageSummaryRecord?.max_severity ??
    damageSummaryRecord?.maxSeverity ??
    null;
  let bestSeverity: ReportSeverity = directSeverity ? String(directSeverity).trim() : "n/a";
  let bestScore = severityScore(directSeverity);
  entries.forEach((entry) => {
    const severity = (entry?.severity || "").toString().trim();
    const score = severityScore(severity);
    if (score > bestScore) {
      bestScore = score;
      bestSeverity = severity;
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

function normalizedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function firstString(...values: unknown[]): string {
  for (const value of values) {
    const normalized = normalizedString(value);
    if (normalized) {
      return normalized;
    }
  }
  return "";
}

function nestedRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readNestedString(record: unknown, key: string): string {
  const current = nestedRecord(record);
  if (!current) return "";
  const value = current[key];
  return typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
}

function collectNestedLocationValues(report: unknown): string[] {
  const record = nestedRecord(report);
  if (!record) return [];
  const payload = nestedRecord(record.payload);
  const nestedReport = nestedRecord(record.report);
  const raw = nestedRecord(record.raw);
  const locations = [
    nestedRecord(record.location),
    nestedRecord(payload?.location),
    nestedRecord(nestedReport?.location),
    nestedRecord(raw?.location),
  ];
  const keys = [
    "facilityId",
    "facility_id",
    "locationId",
    "location_id",
    "facilityName",
    "facility_name",
    "facility",
    "locationLabel",
    "location_label",
    "locationName",
    "location_name",
    "navigation",
  ];
  return [
    ...keys.map((key) => readNestedString(record, key)),
    ...keys.map((key) => readNestedString(payload, key)),
    ...keys.map((key) => readNestedString(nestedReport, key)),
    ...keys.map((key) => readNestedString(raw, key)),
    ...locations.flatMap((location) => keys.map((key) => readNestedString(location, key))),
  ].filter(Boolean);
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
  const topLevelLabel = firstString(
    (report as unknown as Record<string, unknown>).facilityName,
    (report as unknown as Record<string, unknown>).facility_name,
    (report as unknown as Record<string, unknown>).locationLabel,
    report.facility,
    report.navigation,
    report.location_label,
    report.location_name,
    report.location?.facility,
    report.location?.navigation,
    report.location?.location_label,
    report.location?.location_name
  );
  if (topLevelLabel) {
    return normalizeFacilityDisplayValue(topLevelLabel);
  }
  for (const path of damageLocationPaths) {
    const candidate = extractLocationCandidate(report, path);
    if (candidate.trim()) {
      return normalizeFacilityDisplayValue(candidate);
    }
  }
  const locationLabel = report.location?.location_label || "";
  const locationName = report.location?.location_name || "";
  if (locationLabel.trim()) {
    return normalizeFacilityDisplayValue(locationLabel);
  }
  if (locationName.trim()) {
    return normalizeFacilityDisplayValue(locationName);
  }
  return "Other";
}

export function resolveRsaFacilityLabel(report: RsaReportApiRow): string {
  const topLevelLabel = firstString(
    report?.facility,
    report?.navigation,
    report?.location_label,
    report?.location_name,
    report?.location?.facility,
    report?.location?.navigation,
    report?.location?.location_label,
    report?.location?.location_name
  );
  if (topLevelLabel) {
    return normalizeFacilityDisplayValue(topLevelLabel);
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

export function getDamageReportFacilityMatchKeys(report: ReportDamageApiRow): string[] {
  const values = [
    report.facility_id,
    report.location_id,
    (report as unknown as Record<string, unknown>).facilityId,
    (report as unknown as Record<string, unknown>).locationId,
    (report as unknown as Record<string, unknown>).facilityName,
    (report as unknown as Record<string, unknown>).facility_name,
    (report as unknown as Record<string, unknown>).locationLabel,
    (report as unknown as Record<string, unknown>).locationName,
    report.location?.facility_id,
    report.location?.location_id,
    report.facility,
    report.navigation,
    report.location_label,
    report.location_name,
    report.location?.facility,
    report.location?.navigation,
    report.location?.location_label,
    report.location?.location_name,
    resolveDamageReportLocationName(report),
    ...collectNestedLocationValues(report),
  ];
  const keys = values.flatMap((value) => {
    const normalized = normalizedString(value);
    if (!normalized) {
      return [];
    }
    return [normalized, slugForFacilityLabel(normalized)];
  });
  return Array.from(new Set(keys.map((key) => key.trim()).filter(Boolean)));
}

function getSessionLocationMatchKeys(location: PortalSessionLocation): string[] {
  const metadata = location.metadata ?? {};
  const values = [
    location.location_id,
    location.location_label,
    location.location_name,
    location.display_name,
    metadata.location_id,
    metadata.locationId,
    metadata.facility_id,
    metadata.facilityId,
    metadata.location_label,
    metadata.locationLabel,
    metadata.location_name,
    metadata.locationName,
    metadata.facility,
    metadata.facility_name,
    metadata.facilityName,
  ];
  const keys = values.flatMap((value) => {
    const normalized = normalizedString(value).toLowerCase();
    if (!normalized) return [];
    return [normalized, slugForFacilityLabel(normalized)];
  });
  return Array.from(new Set(keys.filter(Boolean)));
}

/** Fill a report's facility label when the API only returned its identifier. */
export function enrichDamageReportFacility(
  report: ReportDamageApiRow,
  locations: readonly PortalSessionLocation[]
): ReportDamageApiRow {
  const existingLabel = resolveDamageReportLocationName(report);
  if (existingLabel && existingLabel !== "Other") return report;

  const reportKeys = new Set(
    getDamageReportFacilityMatchKeys(report).map((key) => key.toLowerCase())
  );
  if (reportKeys.size === 0) return report;

  const match = locations.find((location) =>
    getSessionLocationMatchKeys(location).some((key) => reportKeys.has(key))
  );
  if (!match) return report;

  const label = firstString(
    match.location_label,
    match.display_name,
    match.location_name,
    match.location_id
  );
  if (!label) return report;

  const locationId = firstString(report.location_id, report.facility_id, match.location_id);
  return {
    ...report,
    location_id: locationId,
    facility_id: firstString(report.facility_id, report.location_id, match.location_id),
    location_label: label,
    location_name: label,
    facility: label,
    navigation: label,
    location: {
      ...(report.location ?? {}),
      location_id: firstString(report.location?.location_id, locationId),
      facility_id: firstString(report.location?.facility_id, locationId),
      location_label: label,
      location_name: label,
      facility: label,
      navigation: label,
    },
  };
}

export function getRsaReportFacilityMatchKeys(report: RsaReportApiRow): string[] {
  const values = [
    report.facility_id,
    report.location_id,
    report.location?.facility_id,
    report.location?.location_id,
    report.facility,
    report.navigation,
    report.location_label,
    report.location_name,
    report.location?.facility,
    report.location?.navigation,
    report.location?.location_label,
    report.location?.location_name,
    resolveRsaFacilityLabel(report),
  ];
  const keys = values.flatMap((value) => {
    const normalized = normalizedString(value);
    if (!normalized) {
      return [];
    }
    return [normalized, slugForFacilityLabel(normalized)];
  });
  return Array.from(new Set(keys.map((key) => key.trim()).filter(Boolean)));
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
