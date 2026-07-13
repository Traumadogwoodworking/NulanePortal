export type PortalFilterOption = {
  value: string;
  label: string;
  count?: number;
};

export type PortalFilterFacets = {
  facilities: PortalFilterOption[];
  yards: PortalFilterOption[];
  inspectionTypes: PortalFilterOption[];
  inspectors: PortalFilterOption[];
  statuses: PortalFilterOption[];
  makes: PortalFilterOption[];
  models: PortalFilterOption[];
  severities: PortalFilterOption[];
  damageAreas: PortalFilterOption[];
  damageTypes: PortalFilterOption[];
};

export type PortalFilterFacetsMeta = {
  source: string;
  generatedAt: string;
};

export type PortalFilterFacetsResponse = {
  facets: PortalFilterFacets;
  meta: PortalFilterFacetsMeta;
};

