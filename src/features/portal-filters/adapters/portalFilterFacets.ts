import type {
  PortalFilterFacets,
  PortalFilterFacetsMeta,
  PortalFilterFacetsResponse,
  PortalFilterOption,
} from "@/features/portal-filters/model/facets";

type UnknownRecord = Record<string, unknown>;

const FACET_WIRE_KEYS = {
  facilities: ["facilities"],
  yards: ["yards"],
  inspectionTypes: ["inspectionTypes", "inspection_types"],
  inspectors: ["inspectors"],
  statuses: ["statuses"],
  makes: ["makes"],
  models: ["models"],
  severities: ["severities"],
  damageAreas: ["damageAreas", "damage_areas"],
  damageTypes: ["damageTypes", "damage_types"],
} as const satisfies Record<keyof PortalFilterFacets, readonly string[]>;

const CASE_INSENSITIVE_VALUE_FACETS = new Set<keyof PortalFilterFacets>([
  "inspectors",
  "statuses",
  "makes",
  "models",
  "severities",
  "damageAreas",
  "damageTypes",
]);

export class PortalFilterFacetsContractError extends Error {
  constructor(message: string) {
    super(`Invalid portal filter facets response: ${message}`);
    this.name = "PortalFilterFacetsContractError";
  }
}

function isRecord(value: unknown): value is UnknownRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function compareOptions(left: PortalFilterOption, right: PortalFilterOption): number {
  return (
    compareText(left.label.toLowerCase(), right.label.toLowerCase()) ||
    compareText(left.label, right.label) ||
    compareText(left.value, right.value)
  );
}

function parseOption(value: unknown): PortalFilterOption | null {
  if (!isRecord(value) || typeof value.value !== "string" || typeof value.label !== "string") {
    return null;
  }

  const optionValue = value.value.trim();
  const label = value.label.trim();
  if (!optionValue || !label) return null;

  if (value.count !== undefined) {
    if (typeof value.count !== "number" || !Number.isFinite(value.count) || value.count < 0) {
      return null;
    }
    return { value: optionValue, label, count: value.count };
  }

  return { value: optionValue, label };
}

function normalizeOptions(value: unknown, facetName: keyof PortalFilterFacets): PortalFilterOption[] {
  if (!Array.isArray(value)) {
    throw new PortalFilterFacetsContractError(`${facetName} must be an array`);
  }

  const exactOptions = new Map<string, PortalFilterOption>();
  for (const option of value.map(parseOption).filter((item): item is PortalFilterOption => Boolean(item)).sort(compareOptions)) {
    if (!exactOptions.has(option.value)) exactOptions.set(option.value, option);
  }

  if (!CASE_INSENSITIVE_VALUE_FACETS.has(facetName)) {
    return Array.from(exactOptions.values()).sort(compareOptions);
  }

  const bySemanticValue = new Map<string, PortalFilterOption>();
  for (const option of exactOptions.values()) {
    const key = option.value.toLocaleLowerCase();
    const existing = bySemanticValue.get(key);
    if (!existing) {
      bySemanticValue.set(key, option);
      continue;
    }
    const mergedCount =
      existing.count === undefined && option.count === undefined
        ? undefined
        : (existing.count ?? 0) + (option.count ?? 0);
    bySemanticValue.set(key, {
      ...existing,
      ...(mergedCount === undefined ? {} : { count: mergedCount }),
    });
  }

  return Array.from(bySemanticValue.values()).sort(compareOptions);
}

function readFacet(
  facets: UnknownRecord,
  facetName: keyof PortalFilterFacets,
  wireKeys: readonly string[],
): PortalFilterOption[] {
  const wireKey = wireKeys.find((key) => Object.prototype.hasOwnProperty.call(facets, key));
  if (!wireKey) {
    throw new PortalFilterFacetsContractError(`${facetName} is missing`);
  }
  return normalizeOptions(facets[wireKey], facetName);
}

function parseMeta(value: unknown): PortalFilterFacetsMeta {
  if (!isRecord(value)) {
    throw new PortalFilterFacetsContractError("meta must be an object");
  }

  const source = typeof value.source === "string" ? value.source.trim() : "";
  const rawGeneratedAt = value.generatedAt ?? value.generated_at;
  const generatedAt = typeof rawGeneratedAt === "string" ? rawGeneratedAt.trim() : "";
  if (!source) {
    throw new PortalFilterFacetsContractError("meta.source must be a nonempty string");
  }
  if (!generatedAt || !Number.isFinite(Date.parse(generatedAt))) {
    throw new PortalFilterFacetsContractError("meta.generatedAt must be a valid timestamp");
  }

  return { source, generatedAt };
}

export function parsePortalFilterFacetsResponse(value: unknown): PortalFilterFacetsResponse {
  if (!isRecord(value)) {
    throw new PortalFilterFacetsContractError("response must be an object");
  }
  if (!isRecord(value.facets)) {
    throw new PortalFilterFacetsContractError("facets must be an object");
  }

  const facets = Object.fromEntries(
    (Object.keys(FACET_WIRE_KEYS) as Array<keyof PortalFilterFacets>).map((facetName) => [
      facetName,
      readFacet(value.facets as UnknownRecord, facetName, FACET_WIRE_KEYS[facetName]),
    ]),
  ) as PortalFilterFacets;

  return {
    facets,
    meta: parseMeta(value.meta),
  };
}
