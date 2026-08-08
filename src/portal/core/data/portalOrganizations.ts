export type PortalSuborgKey = "awct" | "signature_vehicle_logistics";
export type PortalOrganizationScopeKey = "all" | PortalSuborgKey;

export type PortalOrganizationScope = {
  key: PortalOrganizationScopeKey;
  label: string;
  facilityLabels: readonly string[];
};

export const PORTAL_ORGANIZATION_SCOPES: readonly PortalOrganizationScope[] = [
  {
    key: "all",
    label: "All organizations",
    facilityLabels: [],
  },
  {
    key: "awct",
    label: "AWCT",
    facilityLabels: ["JNAP", "SHAP", "OTHER"],
  },
  {
    key: "signature_vehicle_logistics",
    label: "Signature Vehicle Logistics",
    facilityLabels: ["Enterprise", "Voyager"],
  },
];

export function normalizePortalOrganizationScope(
  value: unknown
): PortalOrganizationScopeKey | null {
  const candidate = value?.toString().trim().toLowerCase();
  return (
    PORTAL_ORGANIZATION_SCOPES.find(
      (scope) => scope.key === candidate || scope.label.toLowerCase() === candidate
    )?.key ?? null
  );
}

export function getPortalOrganizationScope(
  key: PortalOrganizationScopeKey
): PortalOrganizationScope {
  return PORTAL_ORGANIZATION_SCOPES.find((scope) => scope.key === key) ?? PORTAL_ORGANIZATION_SCOPES[0];
}

export function getPortalSuborgValue(
  key?: PortalOrganizationScopeKey | null
): PortalSuborgKey | undefined {
  return key === "awct" || key === "signature_vehicle_logistics" ? key : undefined;
}

export function appendOrganizationScope(path: string, key?: PortalOrganizationScopeKey | null) {
  const suborg = getPortalSuborgValue(key);
  if (!suborg) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}suborg=${encodeURIComponent(suborg)}`;
}

export function rowMatchesOrganizationScope(
  row: Record<string, unknown>,
  key?: PortalOrganizationScopeKey | null
) {
  if (!key || key === "all") return true;
  const metadata =
    row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};
  const explicitScope = normalizePortalOrganizationScope(
    row.suborg ??
      row.suborg_key ??
      row.suborgKey ??
      row.suborg_id ??
      row.suborgId ??
      row.suborg_label ??
      row.suborgLabel ??
      metadata.suborg ??
      metadata.suborg_key ??
      metadata.suborgKey ??
      metadata.organization_scope ??
      metadata.organizationScope
  );
  if (explicitScope) return explicitScope === key;

  const scope = getPortalOrganizationScope(key);
  const label = (
    row.location_label ??
    row.locationLabel ??
    row.location_name ??
    row.locationName ??
    row.name ??
    row.label ??
    ""
  )
    .toString()
    .trim()
    .toLowerCase();
  return scope.facilityLabels.some((facilityLabel) => {
    const normalizedFacilityLabel = facilityLabel.toLowerCase();
    return label === normalizedFacilityLabel || label.startsWith(`${normalizedFacilityLabel} `);
  });
}

