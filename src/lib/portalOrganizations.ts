export type PortalSuborgKey = string;
export type PortalOrganizationScopeKey = string;

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

export function appendOrganizationScope(path: string, key?: PortalOrganizationScopeKey | null) {
  void key;
  return path;
}

export function getPortalSuborgValue(
  _key?: PortalOrganizationScopeKey | null
): PortalSuborgKey | undefined {
  return undefined;
}

export function rowMatchesOrganizationScope(
  row: Record<string, unknown>,
  key?: PortalOrganizationScopeKey | null
) {
  void row;
  void key;
  return true;
}
