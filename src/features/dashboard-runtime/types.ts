export type RuntimeWidgetKind = "metric" | "trend" | "bar" | "stacked_bar" | "horizontal_bar" | "line" | "table" | "list";

export type RuntimeDatasetSourceType = "existing_endpoint" | "static_demo";

export type RuntimeFieldDefinition = {
  key: string;
  label: string;
  fieldType: "string" | "number" | "date" | "boolean" | "json";
  semanticType: "measure" | "dimension" | "filter";
  aggregation?: "sum" | "count" | "avg" | "min" | "max" | "none";
  required?: boolean;
};

export type RuntimeDatasetDefinition = {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  sourceType: RuntimeDatasetSourceType;
  source?: "dashboard_analytics" | "report_list" | string;
  sourceConfig?: Record<string, unknown>;
  fields: RuntimeFieldDefinition[];
  rows?: RuntimeDataRow[];
  data?: RuntimeDataRow[];
};

export type RuntimeWidgetDefinition = {
  id: string;
  title: string;
  kind: RuntimeWidgetKind;
  datasetId: string;
  measures: string[];
  dimensions: string[];
  requiredFields?: string[];
  component?: string;
  exportFile?: string;
  emptyState?: string;
};

export type RuntimeLayoutItem = {
  widgetId: string;
  section?: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
};

export type RuntimeDashboardDefinition = {
  version: number;
  id: string;
  slug: string;
  title: string;
  description?: string;
  filters?: Array<Record<string, unknown>>;
  datasets: RuntimeDatasetDefinition[];
  widgets: RuntimeWidgetDefinition[];
  layout: RuntimeLayoutItem[];
  coverageRequirements?: RuntimeCoverageWarning[];
  integrityRules?: string[];
};

export type RuntimeDashboardMetadata = {
  slug: string;
  title: string;
  description?: string;
  status?: string;
  version?: number;
};

export type RuntimeCoverageWarning = {
  visualId?: string;
  datasetId?: string;
  currentBackendStatus?: string;
  requiredFields?: string[];
  message?: string;
};

export type RuntimeDataRow = Record<string, unknown>;

export type RuntimeRenderPayload = {
  dashboard: RuntimeDashboardMetadata;
  definition?: RuntimeDashboardDefinition;
  filters?: Record<string, unknown>;
  layout: RuntimeLayoutItem[];
  widgets: RuntimeWidgetDefinition[];
  data: Record<string, unknown>;
  coverageWarnings?: RuntimeCoverageWarning[];
  freshness?: {
    status?: string;
    rendered_at?: string;
    renderedAt?: string;
  };
};

export type RuntimeApiResult<T> = T & {
  ok?: boolean;
  error?: {
    code?: string;
    message?: string;
    details?: unknown[];
  };
};

export type RuntimeCatalogDataset = {
  id: string;
  title: string;
  description?: string;
  sourceType?: string;
  source?: string;
  sourceConfig?: Record<string, unknown>;
  fieldCount?: number;
  fields?: RuntimeFieldDefinition[];
  previewEndpoint?: string;
};

export type RuntimeCatalogWidget = {
  id: string;
  title: string;
  kind?: string;
  datasetId?: string;
  measures?: string[];
  dimensions?: string[];
  requiredFields?: string[];
  exportFile?: string;
};

export type RuntimeCatalogDashboard = {
  slug: string;
  title: string;
  description?: string;
  filters?: Array<Record<string, unknown>>;
  datasets?: string[];
  widgets?: RuntimeCatalogWidget[];
  coverageRequirements?: RuntimeCoverageWarning[];
  integrityRules?: string[];
};

export type RuntimeCatalog = {
  generatedAt?: string;
  service?: string;
  adapterMode?: string;
  nodeApiBaseUrl?: string;
  dashboardCount?: number;
  datasetCount?: number;
  dashboards?: RuntimeCatalogDashboard[];
  datasets?: RuntimeCatalogDataset[];
  supportedExistingEndpoints?: Array<Record<string, unknown>>;
  safeRules?: string[];
};

export type RuntimeDocs = {
  generatedAt?: string;
  title?: string;
  format?: string;
  markdown?: string;
  endpoints?: Array<Record<string, unknown>>;
};

export type RuntimeValidationIssue = {
  path: string;
  message: string;
  code?: string;
};

export type RuntimeValidationResult = {
  valid: boolean;
  errors: RuntimeValidationIssue[];
};
