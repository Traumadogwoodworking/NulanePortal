import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import guideContent from "@/components/facilities/facilityStartupGuideContent.json";

export const facilityStartupSteps = guideContent.steps;

export function buildFacilityGuidePdfDefinition(input: {
  facilityName: string;
  organizationName: string;
  registrationUrl: string;
  supportName: string;
  supportEmail: string;
  supportPhone?: string;
  appName: string;
  appStoreUrl: string;
  googlePlayUrl: string;
  packetRevision?: number;
}): TDocumentDefinitions {
  const steps: Content[] = facilityStartupSteps.map((step, index) => ({
    columns: [
      {
        width: 28,
        text: `${index + 1}.`,
        alignment: "center",
        bold: true,
        color: "#1d4ed8",
        margin: [0, 6, 0, 6],
      },
      {
        width: "*",
        stack: [
          { text: step.title, bold: true, fontSize: 12, margin: [0, 0, 0, 2] },
          { text: step.detail, color: "#475569", fontSize: 10, lineHeight: 1.2 },
        ],
        margin: [0, 1, 0, 0],
      },
    ],
    columnGap: 12,
    margin: [0, 0, 0, 13],
  }));
  const supportLine = [input.supportName, input.supportEmail, input.supportPhone]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ");

  return {
    info: {
      title: `${input.facilityName} Inspection-Trac Facility Access`,
      author: "Nulane Systems",
      subject: `Facility registration and quick start for ${input.facilityName}`,
    },
    pageSize: "LETTER",
    pageMargins: [54, 48, 54, 44],
    content: [
      { text: guideContent.front.eyebrow, color: "#64748b", bold: true, fontSize: 10, characterSpacing: 2.2 },
      { text: input.facilityName, bold: true, fontSize: 30, color: "#0f172a", margin: [0, 15, 0, 3] },
      { text: input.organizationName, color: "#475569", fontSize: 12, margin: [0, 0, 0, 22] },
      { text: guideContent.front.title, bold: true, fontSize: 22, alignment: "center", margin: [0, 0, 0, 8] },
      {
        table: {
          widths: [168],
          body: [[{
            qr: input.registrationUrl,
            fit: 144,
            eccLevel: "M",
            foreground: "#000000",
            background: "#ffffff",
            alignment: "center",
            margin: [12, 12, 12, 12],
          }]],
        },
        alignment: "center",
        layout: {
          hLineColor: () => "#cbd5e1",
          vLineColor: () => "#cbd5e1",
          hLineWidth: () => 1,
          vLineWidth: () => 1,
          paddingLeft: () => 0,
          paddingRight: () => 0,
          paddingTop: () => 0,
          paddingBottom: () => 0,
        },
        margin: [0, 0, 0, 14],
      },
      { text: guideContent.front.instruction, alignment: "center", color: "#334155", fontSize: 11, lineHeight: 1.25, margin: [36, 0, 36, 12] },
      { text: input.registrationUrl, link: input.registrationUrl, alignment: "center", color: "#1d4ed8", fontSize: 8.5, margin: [0, 0, 0, 20] },
      {
        text: guideContent.front.privacy,
        alignment: "center",
        color: "#475569",
        fillColor: "#f1f5f9",
        fontSize: 9.5,
        lineHeight: 1.2,
        margin: [20, 12, 20, 12],
      },
      {
        text: guideContent.back.title,
        pageBreak: "before",
        bold: true,
        fontSize: 26,
        color: "#0f172a",
        margin: [0, 0, 0, 5],
      },
      { text: `${input.facilityName} · ${input.organizationName}`, color: "#475569", fontSize: 11, margin: [0, 0, 0, 22] },
      ...steps,
      {
        text: guideContent.back.safety,
        color: "#7c2d12",
        fillColor: "#fff7ed",
        bold: true,
        fontSize: 9.5,
        lineHeight: 1.2,
        margin: [12, 10, 12, 10],
      },
      {
        columns: [
          {
            width: "*",
            stack: [
              { text: "Install directly", bold: true, fontSize: 11, margin: [0, 0, 0, 5] },
              { text: [{ text: "iPhone: ", bold: true }, { text: "App Store", link: input.appStoreUrl, color: "#1d4ed8" }], fontSize: 9.5 },
              { text: [{ text: "Android: ", bold: true }, { text: "Google Play", link: input.googlePlayUrl, color: "#1d4ed8" }], fontSize: 9.5, margin: [0, 3, 0, 0] },
            ],
          },
          {
            width: "*",
            stack: [
              { text: "Need help?", bold: true, fontSize: 11, margin: [0, 0, 0, 5] },
              { text: supportLine, color: "#334155", fontSize: 9.5, lineHeight: 1.2 },
            ],
          },
        ],
        columnGap: 24,
        margin: [0, 17, 0, 0],
      },
    ],
    footer(currentPage, pageCount) {
      return {
        text: `${input.appName} facility access · Revision ${input.packetRevision || 1} · Page ${currentPage} of ${pageCount}`,
        alignment: "center",
        color: "#64748b",
        fontSize: 8,
        margin: [48, 10, 48, 0],
      };
    },
    defaultStyle: { font: "Roboto", color: "#0f172a" },
  };
}
