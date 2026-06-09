import type {
  MeasurementPoint,
  MeasurementRecord,
} from "@/lib/services/measurementService";
import type { Alignment, Column, Content, TDocumentDefinitions } from "pdfmake/interfaces";
import { publicBranding } from "@/lib/publicBranding";

export interface MeasurementExportRow {
  date: string;
  dimension: string;
  value: string;
  notes: string;
}

const CSV_HEADERS = ["Date", "Dimension", "Value (mm)", "Notes"];

function formatDate(value?: string | null): string {
  if (!value) {
    return "—";
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatValue(raw?: number | null): string {
  if (typeof raw !== "number" || Number.isNaN(raw)) {
    return "—";
  }
  return raw.toFixed(2);
}

function formatNotes(point: MeasurementSource): string {
  if ("measurement" in point && typeof point.measurement?.notes === "string") {
    return point.measurement.notes;
  }
  if ("notes" in point && typeof point.notes === "string") {
    return point.notes;
  }
  if ("metadata" in point && typeof point.metadata?.notes === "string") {
    return point.metadata.notes;
  }
  return "";
}

type MeasurementSource = MeasurementPoint | MeasurementRecord;

function resolveDate(point: MeasurementSource): string | undefined {
  if ("takenAt" in point && point.takenAt) {
    return point.takenAt;
  }
  if ("createdAt" in point && point.createdAt) {
    return point.createdAt;
  }
  if ("updatedAt" in point && point.updatedAt) {
    return point.updatedAt;
  }
  return undefined;
}

function resolveDimension(point: MeasurementSource): string {
  if ("dimension" in point && point.dimension) {
    return point.dimension;
  }
  if ("metadata" in point && typeof point.metadata === "object" && point.metadata !== null) {
    const metadata = point.metadata as Record<string, unknown>;
    if (typeof metadata.dimension === "string") {
      return metadata.dimension;
    }
  }
  return "—";
}

function resolveValue(point: MeasurementSource): number | null {
  if (typeof point.measurement?.value === "number") {
    return point.measurement.value;
  }
  const record = point as MeasurementRecord;
  if (typeof record.measurement?.value === "number") {
    return record.measurement.value;
  }
  return null;
}

export function measurementsToExportRows(points: MeasurementSource[]): MeasurementExportRow[] {
  return points.map((point) => ({
    date: formatDate(resolveDate(point)),
    dimension: resolveDimension(point),
    value: formatValue(resolveValue(point)),
    notes: formatNotes(point),
  }));
}

export function buildCsvContent(rows: MeasurementExportRow[]): string {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [CSV_HEADERS, ...rows.map((row) => [row.date, row.dimension, row.value, row.notes])];
  return lines.map((line) => line.map(escape).join(",")).join("\r\n");
}

export function buildPdfDefinition(options: {
  rows: MeasurementExportRow[];
  orgLabel?: string | null;
  locationLabel?: string | null;
  chartImageUrl?: string | null;
  generatedAt?: string;
}): TDocumentDefinitions {
  const { rows, orgLabel, locationLabel, chartImageUrl, generatedAt } = options;
  const body = [
    [
      { text: CSV_HEADERS[0], style: "tableHeader" },
      { text: CSV_HEADERS[1], style: "tableHeader" },
      { text: CSV_HEADERS[2], style: "tableHeader", alignment: "right" as Alignment },
      { text: CSV_HEADERS[3], style: "tableHeader" },
    ],
    ...rows.map((row) => [
      { text: row.date, style: "tableCell" },
      { text: row.dimension, style: "tableCell" },
      { text: row.value, style: "tableCell", alignment: "right" as Alignment },
      { text: row.notes || "—", style: "tableCell" },
    ]),
  ];

  const badges: Column[] = [];
  if (orgLabel) {
    badges.push({
      stack: [
        { text: "Organization", style: "badgeLabel" },
        { text: orgLabel, style: "badgeValue" },
      ],
      margin: [0, 0, 12, 0] as [number, number, number, number],
    });
  }
  if (locationLabel) {
    badges.push({
      stack: [
        { text: "Location", style: "badgeLabel" },
        { text: locationLabel, style: "badgeValue" },
      ],
    });
  }

  const content: Content[] = [
    { text: "DocuFit Measurements", style: "title" },
    ...(badges.length > 0
      ? [
          {
            columns: [
              { text: "", width: "*" },
              {
                columns: badges,
                width: "auto",
                columnGap: 8,
                alignment: "right" as Alignment,
              },
            ],
            margin: [0, 6, 0, 6] as [number, number, number, number],
          },
        ]
      : [{ text: "" }]),
  ];

  if (chartImageUrl) {
    content.push({
      image: chartImageUrl,
      width: 500,
      margin: [0, 12, 0, 12],
    });
  }

  content.push({
    text: "Measurements",
    style: "sectionHeader",
    margin: [0, 12, 0, 6],
  });

  content.push({
    table: {
      headerRows: 1,
      widths: ["auto", "auto", "auto", "*"],
      body,
    },
    layout: { fillColor: (rowIndex: number) => (rowIndex === 0 ? "#F8FAFC" : null) },
  });

  if (generatedAt) {
    content.push({
      text: `Generated ${generatedAt}`,
      style: "meta",
      margin: [0, 12, 0, 0],
    });
  }

  return {
    pageSize: "A4",
    pageMargins: [40, 40, 40, 40],
    info: {
      title: "DocuFit Measurements",
      author: publicBranding.footerLegalOwner,
    },
    content,
    styles: {
      title: { fontSize: 22, bold: true, color: "#0F172A" },
      sectionHeader: { fontSize: 14, bold: true },
      badgeLabel: { fontSize: 7, bold: true, color: "#94A3B8" },
      badgeValue: { fontSize: 11, bold: true, color: "#0F172A" },
      tableHeader: { fontSize: 9, bold: true, color: "#475467", margin: [0, 4, 0, 4] },
      tableCell: { fontSize: 10, color: "#0F172A", margin: [0, 4, 0, 4] },
      meta: { fontSize: 8, color: "#94A3B8" },
    },
  };
}








