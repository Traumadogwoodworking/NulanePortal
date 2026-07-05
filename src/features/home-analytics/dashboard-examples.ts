import type { HomeDashboardVisualConfig } from "./types";

export type DashboardLanguagePrimitive = {
  name: string;
  businessMeaning: string;
  codeMeaning: string;
  homeExample: string;
};

export type DashboardRecipeKind = "metric" | "chart" | "filter" | "export" | "backend-field";

export type DashboardExampleVisualDeclaration = Pick<
  HomeDashboardVisualConfig,
  | "title"
  | "description"
  | "endpoint"
  | "requiredFields"
  | "dataSource"
  | "measures"
  | "dimensions"
  | "slicers"
  | "adapter"
  | "component"
  | "exportFile"
  | "emptyState"
> & {
  id: string;
};

export type DashboardRecipe = {
  id: string;
  kind: DashboardRecipeKind;
  title: string;
  businessQuestion: string;
  shortAnswer: string;
  copyableSteps: string[];
  visualDeclaration?: DashboardExampleVisualDeclaration;
  mockRows: Array<Record<string, string | number>>;
  code: string;
};

export const DASHBOARD_LANGUAGE_PRIMITIVES: DashboardLanguagePrimitive[] = [
  {
    name: "Measure",
    businessMeaning: "The number the business wants to compare.",
    codeMeaning: "A named numeric value produced by an adapter, such as damageReports or noDamageReports.",
    homeExample: "Damage Reports and Clear Reports in the Damage vs Clear metric.",
  },
  {
    name: "Dimension",
    businessMeaning: "The way the number is grouped.",
    codeMeaning: "A stable row key or label such as date, facility, inspector, severity, or inspection type.",
    homeExample: "Facility Daily Trend groups damaged and clear counts by day and facility.",
  },
  {
    name: "Slicer",
    businessMeaning: "A filter the viewer applies to the dashboard.",
    codeMeaning: "One field in HomeAnalyticsFilters, serialized into the URL and API params.",
    homeExample: "facility, inspector, from, to, status, VIN, and inspection_type.",
  },
  {
    name: "Adapter",
    businessMeaning: "The clean-up step that turns backend data into chart-ready rows.",
    codeMeaning: "A pure TypeScript function in analytics-adapters.ts or export-adapters.ts.",
    homeExample: "buildDailyAnalyticsTrend prepares the facility trend rows and tooltip values.",
  },
  {
    name: "Visual Declaration",
    businessMeaning: "The one-page description of what a chart needs and what it means.",
    codeMeaning: "One HOME_DASHBOARD_VISUALS entry in dashboard-config.ts.",
    homeExample: "facility-daily-trend declares its endpoint, measures, dimensions, slicers, adapter, and export file.",
  },
  {
    name: "Coverage Warning",
    businessMeaning: "A visible note that the backend has not supplied enough fields yet.",
    codeMeaning: "A typed AnalyticsCoverageIssue, created from requiredFields and adapter checks.",
    homeExample: "Clear vs damaged split warnings appear instead of fake damaged counts.",
  },
];

export const DASHBOARD_EXAMPLE_RECIPES: DashboardRecipe[] = [
  {
    id: "add-clear-rate-metric",
    kind: "metric",
    title: "Add A Metric: Clear Rate",
    businessQuestion: "What percentage of inspected submissions were clear?",
    shortAnswer: "Declare a metric that divides explicit clear submissions by explicit clear plus damaged submissions.",
    copyableSteps: [
      "Confirm the backend sends totals.damageReports and totals.noDamageReports.",
      "Add a visual id and HOME_DASHBOARD_VISUALS entry.",
      "Create a small selector that returns clearRate only when both fields are explicit.",
      "Render the value in MetricCard and export it with the scoreboard metrics.",
    ],
    visualDeclaration: {
      id: "summary-clear-rate",
      title: "Clear Rate",
      description: "Share of explicit clear/no-damage submissions across the current filters.",
      endpoint: "/dashboard/analytics",
      requiredFields: ["totals.damageReports", "totals.noDamageReports"],
      dataSource: "dashboard-analytics",
      measures: ["damageReports", "noDamageReports", "clearRate"],
      dimensions: ["organization", "date range"],
      slicers: ["from", "to", "facility", "inspector", "status", "inspection type"],
      adapter: "selectClearRateMetric",
      component: "MetricCard",
      exportFile: "sections/card-data.csv",
      emptyState: "Show coverage warning when the clear/damaged split is missing.",
    },
    mockRows: [
      { label: "Damaged", value: 42 },
      { label: "Clear", value: 108 },
      { label: "Clear Rate", value: "72%" },
    ],
    code: `const totalKnown = damageReports + noDamageReports;
const clearRate = totalKnown > 0 ? noDamageReports / totalKnown : null;`,
  },
  {
    id: "add-inspection-type-chart",
    kind: "chart",
    title: "Add A Chart: Damage By Inspection Type",
    businessQuestion: "Which inspection types are creating the most damaged submissions?",
    shortAnswer: "Add a split chart backed by byInspectionType rows with explicit damaged and clear fields.",
    copyableSteps: [
      "Ask the backend for byInspectionType rows with number, label, damageReports, and noDamageReports.",
      "Add a visual config entry that names the measure and dimension fields.",
      "Add an adapter that returns chart rows with damageCount, clearCount, and totalCount.",
      "Render the prepared rows in the existing chart style and add a CSV export.",
    ],
    visualDeclaration: {
      id: "damage-by-inspection-type",
      title: "Damage By Inspection Type",
      description: "Damaged and clear submissions grouped by inspection type.",
      endpoint: "/dashboard/analytics",
      requiredFields: [
        "byInspectionType.number",
        "byInspectionType.label",
        "byInspectionType.damageReports",
        "byInspectionType.noDamageReports",
      ],
      dataSource: "dashboard-analytics",
      measures: ["damageReports", "noDamageReports"],
      dimensions: ["inspection type number", "inspection type label"],
      slicers: ["from", "to", "facility", "inspector", "status"],
      adapter: "buildDamageByInspectionTypeRows",
      component: "Recharts BarChart",
      exportFile: "damage-by-inspection-type.csv",
      emptyState: "Show coverage warning when split fields are missing.",
    },
    mockRows: [
      { label: "Type 02", damaged: 34, clear: 91 },
      { label: "Type 07", damaged: 18, clear: 44 },
      { label: "Type 12", damaged: 9, clear: 28 },
    ],
    code: `type InspectionTypeRow = {
  number: string;
  label: string;
  damageReports: number;
  noDamageReports: number;
};`,
  },
  {
    id: "add-carrier-filter",
    kind: "filter",
    title: "Add A Filter: Carrier",
    businessQuestion: "Can the viewer narrow the dashboard to one carrier?",
    shortAnswer: "Add carrier as one field in HomeAnalyticsFilters, then serialize it through one shared helper.",
    copyableSteps: [
      "Add carrier?: string to HomeAnalyticsFilters.",
      "Parse and serialize the carrier URL key in filter-state.ts.",
      "Map carrier into buildDashboardAnalyticsParams so analytics and preview requests match.",
      "Add an active filter chip and pass the same filters into exports.",
    ],
    mockRows: [
      { key: "from", value: "2026-07-01" },
      { key: "to", value: "2026-07-05" },
      { key: "carrier", value: "North Rail Logistics" },
    ],
    code: `const nextFilters = {
  ...currentHomeAnalyticsFilters,
  carrier: selectedCarrier,
};`,
  },
  {
    id: "add-visual-export",
    kind: "export",
    title: "Add An Export: Inspection Type CSV",
    businessQuestion: "Can a manager download the rows behind a visual?",
    shortAnswer: "Build export rows from the same prepared view-model rows used by the chart.",
    copyableSteps: [
      "Add exportFile to the visual declaration.",
      "Create an export adapter that accepts normalized chart rows.",
      "Use display labels plus raw numeric values in the CSV.",
      "Add the file to the existing ZIP/all-sections export builder.",
    ],
    mockRows: [
      { inspectionType: "Type 02", damaged: 34, clear: 91, total: 125 },
      { inspectionType: "Type 07", damaged: 18, clear: 44, total: 62 },
    ],
    code: `export function buildInspectionTypeExportRows(rows: InspectionTypeViewRow[]) {
  return rows.map((row) => ({
    inspection_type: row.label,
    damaged_submissions: row.damageCount,
    clear_submissions: row.clearCount,
    total_known_split: row.totalCount,
  }));
}`,
  },
  {
    id: "add-backend-field",
    kind: "backend-field",
    title: "Add A Backend Field: byInspectionType",
    businessQuestion: "What exactly should the backend provide so the frontend can render a new split visual?",
    shortAnswer: "Document the contract first, then keep the frontend honest until that payload exists.",
    copyableSteps: [
      "Document the expected endpoint and field names before rendering the chart.",
      "Use requiredFields in the visual declaration.",
      "Have the adapter detect missing split fields.",
      "Show a coverage warning instead of guessing from totalReports, reports, or count.",
    ],
    mockRows: [
      { field: "byInspectionType[].number", required: "yes" },
      { field: "byInspectionType[].damageReports", required: "yes" },
      { field: "byInspectionType[].noDamageReports", required: "yes" },
    ],
    code: `{
  byInspectionType: [
    {
      number: "02",
      label: "Type 02",
      damageReports: 34,
      noDamageReports: 91
    }
  ]
}`,
  },
];

export const DASHBOARD_EXAMPLE_FLOW = [
  "URL query params",
  "parseHomeAnalyticsFilters()",
  "currentHomeAnalyticsFilters",
  "buildDashboardAnalyticsParams()",
  "GET /dashboard/analytics and GET /reports/list",
  "analytics-adapters.ts",
  "dashboard-config.ts",
  "page.tsx renders visuals",
  "export-adapters.ts",
];
