import type {
  RuntimeDashboardDefinition,
  RuntimeDataRow,
  RuntimeValidationResult,
  RuntimeWidgetDefinition,
} from "./types";

const allowedKinds = new Set(["metric", "trend", "bar", "stacked_bar", "horizontal_bar", "line", "table", "list"]);
const allowedSources = new Set(["existing_endpoint", "static_demo"]);

const dashboardRows: RuntimeDataRow[] = [
  {
    "scope.organization_id": "demo-org",
    "totals.damageReports": 1563,
    "totals.noDamageReports": 583,
    "totals.damageReportsToday": 28,
    "totals.clearReportsToday": 41,
  },
  { "dailyTrend.date": "2026-07-01", "dailyTrend.facility": "Facility A", "dailyTrend.inspector_email": "ana@example.com", "dailyTrend.damageReports": 44, "dailyTrend.noDamageReports": 21 },
  { "dailyTrend.date": "2026-07-02", "dailyTrend.facility": "Facility A", "dailyTrend.inspector_email": "mike@example.com", "dailyTrend.damageReports": 37, "dailyTrend.noDamageReports": 28 },
  { "dailyTrend.date": "2026-07-03", "dailyTrend.facility": "Conner", "dailyTrend.inspector_email": "ana@example.com", "dailyTrend.damageReports": 31, "dailyTrend.noDamageReports": 34 },
  { "bySeverity.severity": "Low", "bySeverity.count": 118 },
  { "bySeverity.severity": "Medium", "bySeverity.count": 84 },
  { "bySeverity.severity": "High", "bySeverity.count": 39 },
  { "topAreas.damage_area": "Front bumper", "topAreas.count": 74 },
  { "topAreas.damage_area": "Driver door", "topAreas.count": 62 },
  { "topAreas.damage_area": "Rear quarter", "topAreas.count": 49 },
  { "topTypes.damage_type": "Scratch", "topTypes.count": 101 },
  { "topTypes.damage_type": "Dent", "topTypes.count": 77 },
  { "topTypes.damage_type": "Missing part", "topTypes.count": 24 },
];

const reportRows: RuntimeDataRow[] = [
  { "rows.report_id": "DD-10091", "rows.vin": "1C4RJFBG0RC10091", "rows.status": "complete", "rows.inspector_email": "ana@example.com", "rows.created_at": "2026-07-03", "rows.location.facility": "Facility A", "rows.damage_summary.count": 3 },
  { "rows.report_id": "DD-10092", "rows.vin": "1C4RJFBG0RC10092", "rows.status": "complete", "rows.inspector_email": "mike@example.com", "rows.created_at": "2026-07-03", "rows.location.facility": "Facility B", "rows.damage_summary.count": 0 },
  { "rows.report_id": "DD-10093", "rows.vin": "1C4RJFBG0RC10093", "rows.status": "review", "rows.inspector_email": "ana@example.com", "rows.created_at": "2026-07-04", "rows.location.facility": "Facility A", "rows.damage_summary.count": 1 },
];

export const REFERENCE_HOME_DASHBOARD: RuntimeDashboardDefinition = {
  version: 1,
  id: "home-inspection-overview",
  slug: "home-inspection-overview",
  title: "Home Inspection Overview",
  description: "Reference runtime version of the current /home analytics dashboard.",
  filters: [
    { key: "from", label: "From", type: "date", queryParam: "from" },
    { key: "to", label: "To", type: "date", queryParam: "to" },
    { key: "facility", label: "Facility", type: "select", queryParam: "facility_id" },
    { key: "inspector", label: "Inspector", type: "select", queryParam: "inspector_email" },
    { key: "status", label: "Status", type: "select", queryParam: "status" },
    { key: "inspection_type", label: "Inspection Type", type: "select", queryParam: "inspection_type" },
    { key: "severity", label: "Severity", type: "select", queryParam: "severity" },
    { key: "damage_area", label: "Damage Area", type: "select", queryParam: "damage_area" },
  ],
  datasets: [
    {
      id: "dashboard_analytics",
      title: "Dashboard Analytics",
      sourceType: "static_demo",
      source: "dashboard_analytics",
      fields: [
        { key: "scope.organization_id", label: "Organization", fieldType: "string", semanticType: "filter" },
        { key: "totals.damageReports", label: "Damaged Submissions", fieldType: "number", semanticType: "measure", aggregation: "sum", required: true },
        { key: "totals.noDamageReports", label: "Clear Submissions", fieldType: "number", semanticType: "measure", aggregation: "sum", required: true },
        { key: "totals.damageReportsToday", label: "Damaged Today", fieldType: "number", semanticType: "measure", aggregation: "sum" },
        { key: "totals.clearReportsToday", label: "Clear Today", fieldType: "number", semanticType: "measure", aggregation: "sum" },
        { key: "dailyTrend.date", label: "Day", fieldType: "date", semanticType: "dimension" },
        { key: "dailyTrend.facility", label: "Facility", fieldType: "string", semanticType: "dimension" },
        { key: "dailyTrend.inspector_email", label: "Inspector", fieldType: "string", semanticType: "dimension" },
        { key: "dailyTrend.damageReports", label: "Daily Damaged", fieldType: "number", semanticType: "measure", aggregation: "sum" },
        { key: "dailyTrend.noDamageReports", label: "Daily Clear", fieldType: "number", semanticType: "measure", aggregation: "sum" },
        { key: "bySeverity.severity", label: "Severity", fieldType: "string", semanticType: "dimension" },
        { key: "bySeverity.count", label: "Severity Count", fieldType: "number", semanticType: "measure", aggregation: "sum" },
        { key: "topAreas.damage_area", label: "Damage Area", fieldType: "string", semanticType: "dimension" },
        { key: "topAreas.count", label: "Area Count", fieldType: "number", semanticType: "measure", aggregation: "sum" },
        { key: "topTypes.damage_type", label: "Damage Type", fieldType: "string", semanticType: "dimension" },
        { key: "topTypes.count", label: "Type Count", fieldType: "number", semanticType: "measure", aggregation: "sum" },
      ],
      rows: dashboardRows,
    },
    {
      id: "report_list",
      title: "Report Preview",
      sourceType: "static_demo",
      source: "report_list",
      fields: [
        { key: "rows.report_id", label: "Report ID", fieldType: "string", semanticType: "dimension" },
        { key: "rows.vin", label: "VIN", fieldType: "string", semanticType: "dimension" },
        { key: "rows.status", label: "Status", fieldType: "string", semanticType: "filter" },
        { key: "rows.inspector_email", label: "Inspector", fieldType: "string", semanticType: "dimension" },
        { key: "rows.created_at", label: "Created At", fieldType: "date", semanticType: "dimension" },
        { key: "rows.location.facility", label: "Facility", fieldType: "string", semanticType: "dimension" },
        { key: "rows.damage_summary.count", label: "Damage Count", fieldType: "number", semanticType: "measure", aggregation: "sum" },
      ],
      rows: reportRows,
    },
  ],
  widgets: [
    metric("total-damage-submissions", "Total Damage Submissions", ["totals.damageReports", "totals.noDamageReports"]),
    metric("damaged-submissions-today", "Damaged Submissions Today", ["totals.damageReportsToday", "totals.clearReportsToday"]),
    metric("damage-vs-clear", "Damage vs Clear", ["totals.damageReports", "totals.noDamageReports"]),
    chart("facility-daily-trend", "Facility Daily Trend", "stacked_bar", ["dailyTrend.damageReports", "dailyTrend.noDamageReports"], ["dailyTrend.date", "dailyTrend.facility"]),
    chart("inspector-daily-trend", "Inspector Daily Trend", "stacked_bar", ["dailyTrend.damageReports", "dailyTrend.noDamageReports"], ["dailyTrend.date", "dailyTrend.inspector_email"]),
    chart("severity", "Severity", "bar", ["bySeverity.count"], ["bySeverity.severity"]),
    chart("top-damage-areas", "Top Damage Areas", "horizontal_bar", ["topAreas.count"], ["topAreas.damage_area"]),
    chart("top-damage-types", "Top Damage Types", "horizontal_bar", ["topTypes.count"], ["topTypes.damage_type"]),
    {
      id: "report-preview-table",
      title: "Report Preview",
      kind: "table",
      datasetId: "report_list",
      measures: ["rows.damage_summary.count"],
      dimensions: ["rows.report_id", "rows.vin", "rows.status", "rows.inspector_email", "rows.created_at", "rows.location.facility"],
      requiredFields: ["rows.report_id", "rows.vin", "rows.status", "rows.created_at"],
      component: "RuntimeTableWidget",
      exportFile: "report-preview.csv",
    },
  ],
  layout: [
    { widgetId: "total-damage-submissions", section: "Scoreboard", x: 0, y: 0, w: 3, h: 1 },
    { widgetId: "damaged-submissions-today", section: "Scoreboard", x: 3, y: 0, w: 3, h: 1 },
    { widgetId: "damage-vs-clear", section: "Scoreboard", x: 6, y: 0, w: 3, h: 1 },
    { widgetId: "facility-daily-trend", section: "Daily Trends", x: 0, y: 1, w: 6, h: 3 },
    { widgetId: "inspector-daily-trend", section: "Daily Trends", x: 6, y: 1, w: 6, h: 3 },
    { widgetId: "severity", section: "Damage Profile", x: 0, y: 4, w: 4, h: 3 },
    { widgetId: "top-damage-areas", section: "Damage Profile", x: 4, y: 4, w: 4, h: 3 },
    { widgetId: "top-damage-types", section: "Damage Profile", x: 8, y: 4, w: 4, h: 3 },
    { widgetId: "report-preview-table", section: "Preview", x: 0, y: 7, w: 12, h: 3 },
  ],
  coverageRequirements: [
    { visualId: "damage-vs-clear", currentBackendStatus: "missing_clear_split", requiredFields: ["totals.noDamageReports", "totals.clearReports"] },
    { visualId: "facility-daily-trend", currentBackendStatus: "missing_facility_daily_clear_split", requiredFields: ["dailyTrend.facility", "dailyTrend.noDamageReports"] },
    { visualId: "inspector-daily-trend", currentBackendStatus: "missing_inspector_daily_clear_split", requiredFields: ["dailyTrend.inspector_email", "dailyTrend.noDamageReports"] },
  ],
  integrityRules: [
    "Do not derive damaged submissions from generic totals.",
    "Clear and damaged values require explicit backend fields.",
  ],
};

export function validateDashboardDefinition(definition: RuntimeDashboardDefinition): RuntimeValidationResult {
  const errors: RuntimeValidationResult["errors"] = [];
  if (!definition.slug && !definition.id) errors.push({ path: "slug", message: "Dashboard requires slug or id." });
  if (!definition.title) errors.push({ path: "title", message: "Dashboard requires title." });
  if (!definition.datasets?.length) errors.push({ path: "datasets", message: "Dashboard requires datasets." });
  if (!definition.widgets?.length) errors.push({ path: "widgets", message: "Dashboard requires widgets." });

  const datasetFields = new Map(definition.datasets.map((dataset) => [dataset.id, new Set(dataset.fields.map((field) => field.key))]));
  definition.datasets.forEach((dataset, index) => {
    if (!allowedSources.has(dataset.sourceType)) errors.push({ path: `datasets[${index}].sourceType`, message: `Unsupported source type ${dataset.sourceType}.` });
  });
  definition.widgets.forEach((widget, index) => {
    if (!allowedKinds.has(widget.kind)) errors.push({ path: `widgets[${index}].kind`, message: `Unsupported widget kind ${widget.kind}.` });
    const fields = datasetFields.get(widget.datasetId);
    if (!fields) {
      errors.push({ path: `widgets[${index}].datasetId`, message: `Unknown dataset ${widget.datasetId}.` });
      return;
    }
    [...widget.measures, ...widget.dimensions, ...(widget.requiredFields ?? [])].forEach((field) => {
      if (!fields.has(field)) errors.push({ path: `widgets[${index}].fields`, message: `Unknown field ${field}.`, code: "unknown_field" });
    });
  });
  return { valid: errors.length === 0, errors };
}

function metric(id: string, title: string, measures: string[]): RuntimeWidgetDefinition {
  return {
    id,
    title,
    kind: "metric",
    datasetId: "dashboard_analytics",
    measures,
    dimensions: ["scope.organization_id"],
    requiredFields: measures,
    component: "RuntimeMetricWidget",
    exportFile: `${id}.csv`,
  };
}

function chart(
  id: string,
  title: string,
  kind: RuntimeWidgetDefinition["kind"],
  measures: string[],
  dimensions: string[],
): RuntimeWidgetDefinition {
  return {
    id,
    title,
    kind,
    datasetId: "dashboard_analytics",
    measures,
    dimensions,
    requiredFields: [...measures, ...dimensions],
    component: "RuntimeChartWidget",
    exportFile: `${id}.csv`,
  };
}
