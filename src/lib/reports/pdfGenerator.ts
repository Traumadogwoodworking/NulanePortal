/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TDocumentDefinitions } from "pdfmake/interfaces";
import type { ReportDamageApiRow, ReportDamageEntry, RsaReportApiRow, BrandingSnapshot } from "@/lib/types";
import type { ReportMapMetadata } from "@/lib/reportMap";
import { resolveDamageReportLocationName, deriveMostMajorDamage, deriveReportSeverity, resolveRsaFacilityLabel, resolveCarDisplayInfo } from "@/lib/reportUtils";

/**
 * Builds the PDF definition for a Damage Report.
 */
export function buildDamageReportPdfDefinition(options: {
  report: ReportDamageApiRow;
  branding?: BrandingSnapshot;
  generatedAt?: string;
  mapImage?: string | null;
  mapMetadata?: ReportMapMetadata | null;
}): TDocumentDefinitions {
  const { report, branding, generatedAt, mapImage, mapMetadata } = options;
  const primaryColor = branding?.primary_color || "#2563eb";
  const secondaryColor = branding?.secondary_color || "#0F172A";

  const locationName = resolveDamageReportLocationName(report);
  const severity = deriveReportSeverity(report);
  const majorDamage = deriveMostMajorDamage(report);

  const damageRows = (report.damage_entries || []).map((entry: ReportDamageEntry) => {
    const severityValue = normalizeSeverityText(entry.severity, "Low");
    return [
    { text: entry.damage_area || "General", style: "tableCell" },
    { text: entry.damage_type || "Unknown", style: "tableCell" },
      { text: severityValue.toUpperCase(), style: "tableCell", color: getSeverityColor(severityValue) },
    { text: entry.comments || "—", style: "tableCell" },
    ];
  });

  const content: any = [
    {
      columns: [
        {
          stack: [
            { text: "DAMAGE INSPECTION REPORT", style: "reportLabel" },
            { text: `${report.make} ${report.model}`.toUpperCase(), style: "title" },
            { text: `VIN: ${report.vin || "N/A"}`, style: "subtitle" },
          ],
          width: "*",
        },
        {
          stack: [
            { text: branding?.organization_name || "VALAD DENT", style: "orgName", alignment: "right" },
            { text: locationName, style: "locationLabel", alignment: "right" },
            { text: `Report ID: #${report.report_id.substring(0, 8)}`, style: "meta", alignment: "right" },
          ],
          width: "auto",
        },
      ],
      margin: [0, 0, 0, 20],
    },
    {
      canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 2, color: primaryColor }],
      margin: [0, 0, 0, 20],
    },
    {
      columns: [
        {
          stack: [
            { text: "INSPECTION METADATA", style: "sectionHeader" },
            {
              columns: [
                { text: "Inspector:", style: "fieldLabel", width: 60 },
                { text: report.inspector_email || "System", style: "fieldValue" },
              ],
              margin: [0, 4, 0, 0],
            },
            {
              columns: [
                { text: "Date:", style: "fieldLabel", width: 60 },
                { text: report.created_at ? new Date(report.created_at).toLocaleString() : "Date Unknown", style: "fieldValue" },
              ],
              margin: [0, 2, 0, 0],
            },
            {
              columns: [
                { text: "Severity:", style: "fieldLabel", width: 60 },
                { text: normalizeSeverityText(severity, "Unknown").toUpperCase(), style: "fieldValue", color: getSeverityColor(severity) },
              ],
              margin: [0, 2, 0, 0],
            },
          ],
        },
        {
          stack: [
            { text: "OPERATIONAL CONCERN", style: "sectionHeader" },
            { text: majorDamage, style: "importantValue", color: primaryColor },
            { text: report.comments || "No additional comments provided.", style: "fieldValue", margin: [0, 4, 0, 0] },
          ],
        },
      ],
      margin: [0, 0, 0, 30],
    },
    { text: "DAMAGE ENTRIES", style: "sectionHeader", margin: [0, 0, 0, 10] },
    {
      table: {
        headerRows: 1,
        widths: ["auto", "auto", 60, "*"],
        body: [
          [
            { text: "AREA", style: "tableHeader" },
            { text: "TYPE", style: "tableHeader" },
            { text: "SEVERITY", style: "tableHeader" },
            { text: "COMMENTS", style: "tableHeader" },
          ],
          ...damageRows,
        ],
      },
      layout: {
        hLineWidth: () => 0.5,
        vLineWidth: () => 0,
        hLineColor: () => "#E2E8F0",
        fillColor: (rowIndex: number) => (rowIndex === 0 ? "#F8FAFC" : undefined),
        paddingLeft: () => 8,
        paddingRight: () => 0,
        paddingTop: () => 6,
        paddingBottom: () => 6,
      },
    },
  ];

  if (mapImage && mapMetadata) {
    content.splice(2, 0, {
      columns: [
        {
          image: mapImage,
          width: 260,
          height: 150,
          margin: [0, 0, 20, 0],
        },
        {
          stack: [
            { text: "Location reference", style: "sectionHeader" },
            { text: `Lat: ${mapMetadata.lat.toFixed(6)}`, style: "fieldValue" },
            { text: `Lon: ${mapMetadata.lon.toFixed(6)}`, style: "fieldValue" },
            {
              text: "View map",
              link: mapMetadata.mapLink,
              style: "mapLink",
              margin: [0, 4, 0, 0],
            },
          ],
          width: "*",
        },
      ],
      margin: [0, 0, 0, 20],
    });
  }

  if (generatedAt) {
    content.push({
      text: `PDF Generated automatically via Valad Portal at ${generatedAt}`,
      style: "footer",
      margin: [0, 40, 0, 0],
    });
  }

  return {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    info: {
      title: `Damage Report - ${report.vin || report.report_id}`,
      author: "Valad Portal",
      subject: "Inspection Report",
    },
    content,
    styles: {
      reportLabel: { fontSize: 8, bold: true, color: "#94A3B8", margin: [0, 0, 0, 2] },
      title: { fontSize: 24, bold: true, color: secondaryColor },
      subtitle: { fontSize: 10, color: "#64748B", margin: [0, 2, 0, 0] },
      orgName: { fontSize: 14, bold: true, color: primaryColor },
      locationLabel: { fontSize: 10, bold: true, color: "#475467" },
      meta: { fontSize: 8, color: "#94A3B8", margin: [0, 2, 0, 0] },
      sectionHeader: { fontSize: 10, bold: true, color: "#94A3B8", margin: [0, 0, 0, 8] },
      fieldLabel: { fontSize: 9, bold: true, color: "#64748B" },
      fieldValue: { fontSize: 10, color: "#0F172A" },
      importantValue: { fontSize: 12, bold: true },
      tableHeader: { fontSize: 8, bold: true, color: "#475467", margin: [0, 4, 0, 4] },
      tableCell: { fontSize: 10, color: "#0F172A" },
      footer: { fontSize: 7, italics: true, color: "#94A3B8", alignment: "center" },
      mapLink: { fontSize: 9, bold: true, color: "#2563eb", decoration: "underline" },
    },
  };
}

function normalizeSeverityText(severity: unknown, fallback = "Unknown"): string {
  if (severity === undefined || severity === null) {
    return fallback;
  }
  const text = typeof severity === "string" ? severity : String(severity);
  const trimmed = text.trim();
  return trimmed || fallback;
}

function getSeverityColor(severity?: string | number | null): string {
  const s = normalizeSeverityText(severity, "").toLowerCase();
  if (s === "high" || s === "critical") return "#E11D48";
  if (s === "medium") return "#D97706";
  if (s === "low") return "#059669";
  return "#0F172A";
}

/**
 * Builds the PDF definition for an RSA (Rail Scan) Report.
 */
export function buildRsaReportPdfDefinition(options: {
  report: RsaReportApiRow;
  branding?: BrandingSnapshot;
  generatedAt?: string;
  mapImage?: string | null;
  mapMetadata?: ReportMapMetadata | null;
}): TDocumentDefinitions {
  const { report, branding, generatedAt, mapImage, mapMetadata } = options;
  const primaryColor = branding?.primary_color || "#3b82f6";
  const secondaryColor = branding?.secondary_color || "#0F172A";

  const facilityLabel = resolveRsaFacilityLabel(report);
  
  const manifestContent: any[] = [];
  
  (report.cars || []).forEach((car: any) => {
    const { railcarId, deckVinsMap } = resolveCarDisplayInfo(car);
    
    manifestContent.push({
      stack: [
        { text: `RAILCAR #${railcarId}`, style: "railcarLabel", margin: [0, 15, 0, 5] },
        {
          columns: Object.entries(deckVinsMap).map(([deckType, vins]) => ({
            stack: [
              { text: `DECK ${deckType}`, style: "deckLabel" },
              ...vins.map((vin, vIdx) => ({
                columns: [
                  { text: `${vIdx + 1}`, width: 10, style: "assetIndex" },
                  { text: vin, style: "assetVin" }
                ],
                margin: [0, 2, 0, 0]
              }))
            ],
            width: "33%"
          }))
        }
      ]
    });
  });

  const content: any = [
    {
      columns: [
        {
          stack: [
            { text: "RSA LOGISTICS MANIFEST", style: "reportLabel" },
            { text: (report.subject || "Railcar Inbound Entry").toUpperCase(), style: "title" },
            { text: `Facility: ${facilityLabel}`, style: "subtitle" },
          ],
          width: "*",
        },
        {
          stack: [
            { text: branding?.organization_name || "VALAD DENT", style: "orgName", alignment: "right" },
            { text: `Manifest ID: #${report.report_id.substring(0, 8)}`, style: "meta", alignment: "right" },
          ],
          width: "auto",
        },
      ],
      margin: [0, 0, 0, 20],
    },
    {
      canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 2, color: primaryColor }],
      margin: [0, 0, 0, 20],
    },
    {
      columns: [
        {
          stack: [
            { text: "OPERATIONAL METADATA", style: "sectionHeader" },
            {
              columns: [
                { text: "Track:", style: "fieldLabel", width: 60 },
                { text: report.track || "—", style: "fieldValue" },
              ],
              margin: [0, 4, 0, 0],
            },
            {
              columns: [
                { text: "Spot:", style: "fieldLabel", width: 60 },
                { text: report.spot || "—", style: "fieldValue" },
              ],
              margin: [0, 2, 0, 0],
            },
            {
              columns: [
                { text: "Operator:", style: "fieldLabel", width: 60 },
                { text: report.inspector_email || "System Terminal", style: "fieldValue" },
              ],
              margin: [0, 2, 0, 0],
            },
          ],
        },
        {
          stack: [
            { text: "REGISTRY TIMESTAMP", style: "sectionHeader" },
            { text: report.created_at ? new Date(report.created_at).toLocaleString() : "Sync Offline", style: "importantValue", color: primaryColor },
          ],
        },
      ],
      margin: [0, 0, 0, 10],
    },
    { text: "MANIFEST PAYLOAD", style: "sectionHeader", margin: [0, 10, 0, 5] },
    ...manifestContent,
  ];

  if (mapImage && mapMetadata) {
    content.splice(2, 0, {
      columns: [
        {
          image: mapImage,
          width: 260,
          height: 150,
          margin: [0, 0, 20, 0],
        },
        {
          stack: [
            { text: "Location reference", style: "sectionHeader" },
            { text: `Lat: ${mapMetadata.lat.toFixed(6)}`, style: "fieldValue" },
            { text: `Lon: ${mapMetadata.lon.toFixed(6)}`, style: "fieldValue" },
            {
              text: "View map",
              link: mapMetadata.mapLink,
              style: "mapLink",
              margin: [0, 4, 0, 0],
            },
          ],
          width: "*",
        },
      ],
      margin: [0, 0, 0, 20],
    });
  }

  if (generatedAt) {
    content.push({
      text: `PDF Generated automatically via Valad Portal at ${generatedAt}`,
      style: "footer",
      margin: [0, 40, 0, 0],
    });
  }

  return {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    info: {
      title: `RSA Manifest - ${report.report_id}`,
      author: "Valad Portal",
      subject: "Logistics Manifest",
    },
    content,
    styles: {
      reportLabel: { fontSize: 8, bold: true, color: "#94A3B8", margin: [0, 0, 0, 2] },
      title: { fontSize: 20, bold: true, color: secondaryColor },
      subtitle: { fontSize: 10, color: "#64748B", margin: [0, 2, 0, 0] },
      orgName: { fontSize: 14, bold: true, color: primaryColor },
      meta: { fontSize: 8, color: "#94A3B8", margin: [0, 2, 0, 0] },
      sectionHeader: { fontSize: 10, bold: true, color: "#94A3B8", margin: [0, 0, 0, 8] },
      fieldLabel: { fontSize: 9, bold: true, color: "#64748B" },
      fieldValue: { fontSize: 10, color: "#0F172A" },
      importantValue: { fontSize: 12, bold: true },
      railcarLabel: { fontSize: 11, bold: true, color: "#475467", background: "#f8fafc" },
      deckLabel: { fontSize: 8, bold: true, color: "#94A3B8", margin: [0, 5, 0, 2] },
      assetIndex: { fontSize: 7, color: "#94A3B8", bold: true },
      assetVin: { fontSize: 9, font: "Roboto", color: "#0F172A", bold: true },
      footer: { fontSize: 7, italics: true, color: "#94A3B8", alignment: "center" },
      mapLink: { fontSize: 9, bold: true, color: "#2563eb", decoration: "underline" },
    },
  };
}

