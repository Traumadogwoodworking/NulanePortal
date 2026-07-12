export const homeDashboardAnalyticsFixture = {
  totals: {
    totalReports: 18,
    damageReports: 12,
    noDamageReports: 6,
    rsaReports: 4,
    damageReportsToday: 3,
    noDamageReportsToday: 1,
    rsaReportsToday: 1,
    facilities: 2,
    vins: 9,
    entries: 12,
  },
  currentPeriod: {
    damageToday: 3,
    clearToday: 1,
    rsaToday: 1,
    damageLast7Days: 8,
    rsaLast7Days: 2,
    damageMonthToDate: 12,
    damageYearToDate: 12,
  },
  filters: {
    facilities: [
      { label: "SHAP", value: "it-9a6e0f-locawctshap", count: 6 },
      { label: "JNAP", value: "it-9a6e0f-locawctjn", count: 6 },
    ],
    yards: [
      { label: "SHAP - Dropzone", value: "SHAP-DROPZONE", count: 3 },
      { label: "JNAP - Main", value: "JNAP-MAIN", count: 3 },
    ],
    models: [
      { label: "Transit", value: "Transit", count: 5 },
      { label: "Express", value: "Express", count: 4 },
    ],
  },
  severity: [
    { level: "6", label: "6 - Missing / Major Damage", count: 5, percent: 41.7 },
    { level: "3", label: "3 - >3 in to <=6 in", count: 4, percent: 33.3 },
    { level: "1", label: "1 - <=1 in", count: 3, percent: 25 },
  ],
  severityGroups: { low: 3, medium: 4, high: 5 },
  dailyTrend: [
    { date: "2026-07-07", damageReports: 2, rsaReports: 1 },
    { date: "2026-07-08", damageReports: 4, rsaReports: 1 },
    { date: "2026-07-09", damageReports: 6, rsaReports: 2 },
  ],
  byFacility: [
    { key: "it-9a6e0f-locawctshap", label: "SHAP", totalReports: 6, damageReports: 6, rsaReports: 1, reportsToday: 2, reportsLast7Days: 6, reportsThisMonth: 6, reportsThisYear: 6, vins: 4, entries: 6 },
    { key: "it-9a6e0f-locawctjn", label: "JNAP", totalReports: 6, damageReports: 6, rsaReports: 3, reportsToday: 1, reportsLast7Days: 6, reportsThisMonth: 6, reportsThisYear: 6, vins: 5, entries: 6 },
  ],
  topAreas: [
    { name: "Front Bumper", count: 7 },
    { name: "Hood", count: 5 },
  ],
  topTypes: [
    { name: "DENTED - PAINT BROKEN", count: 6 },
    { name: "SCRATCHED", count: 4 },
  ],
  byInspector: [
    { email: "inspector@example.com", label: "inspector@example.com", reportCount: 7 },
    { email: "lead@example.com", label: "lead@example.com", reportCount: 5 },
  ],
  byInspectionType: [
    { number: "02", label: "Interchange Inspection", count: 12 },
  ],
};

export const homeDashboardReportListFixture = {
  rows: [
    {
      report_id: "IT-1001",
      vin: "VIN000000000001",
      make: "Ford",
      model: "Transit",
      yard: "SHAP-DROPZONE",
      location_label: "SHAP",
      inspection_type: "02",
      inspector_email: "inspector@example.com",
      created_at: "2026-07-09T12:00:00.000Z",
      damage_summary: [{ damage_area: "Front Bumper", damage_type: "DENTED - PAINT BROKEN", severity: 6 }],
    },
    {
      report_id: "IT-1002",
      vin: "VIN000000000002",
      make: "Chevrolet",
      model: "Express",
      yard: "JNAP-MAIN",
      location_label: "JNAP",
      inspection_type: "02",
      inspector_email: "lead@example.com",
      created_at: "2026-07-08T12:00:00.000Z",
      damage_summary: [{ damage_area: "Hood", damage_type: "SCRATCHED", severity: 3 }],
    },
  ],
  page: 1,
  pageSize: 50,
  total: 2,
  hasNextPage: false,
};
