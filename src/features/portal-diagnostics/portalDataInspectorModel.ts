export type PortalDiagnosticValue = string | number | boolean | null;

export type PortalDataInspectorRequestInput = {
  requestId?: unknown;
  startedAt?: unknown;
  endedAt?: unknown;
  durationMs?: unknown;
  status?: unknown;
};

export type PortalDataInspectorInput = {
  canonicalFilters?: unknown;
  endpointParams?: unknown;
  activeEndpoint?: unknown;
  request?: PortalDataInspectorRequestInput | null;
  rowCount?: unknown;
  totalCount?: unknown;
  facetSource?: unknown;
  facetCounts?: unknown;
  snapshotStatus?: unknown;
  cacheState?: unknown;
  errorCategory?: unknown;
  lastUpdated?: unknown;
};

export type NormalizedPortalDataInspector = {
  canonicalFilters: Record<string, PortalDiagnosticValue>;
  endpointParams: Record<string, PortalDiagnosticValue>;
  activeEndpoint: string | null;
  request: {
    requestId: string | null;
    startedAt: string | null;
    endedAt: string | null;
    durationMs: number | null;
    status: string | number;
  };
  counts: {
    rows: number | null;
    total: number | null;
  };
  facets: {
    source: string;
    counts: Record<string, number>;
  };
  snapshotStatus: string;
  cacheState: string;
  errorCategory: string;
  lastUpdated: string | null;
};
