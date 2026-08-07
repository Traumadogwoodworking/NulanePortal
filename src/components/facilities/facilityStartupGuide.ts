import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import guideContent from "@/components/facilities/facilityStartupGuideContent.json";

export const facilityStartupSteps = guideContent.steps;

export function buildFacilityGuidePdfDefinition(input: {
  facilityName: string;
  organizationName: string;
  registrationUrl: string;
  qrDataUrl: string;
  supportName: string;
  supportEmail: string;
  appName: string;
  appStoreUrl: string;
  googlePlayUrl: string;
}): TDocumentDefinitions {
  const steps: Content[] = facilityStartupSteps.map((step, index) => ({
    stack: [
      { text: `${index + 1}. ${step.title}`, bold: true, fontSize: 12, margin: [0, 0, 0, 2] },
      { text: step.detail, color: "#475569", fontSize: 10, margin: [0, 0, 0, 9] },
    ],
  }));
  return {
    pageSize: "LETTER",
    pageMargins: [48, 42, 48, 42],
    content: [
      { text: input.appName, color: "#64748b", bold: true, fontSize: 10, characterSpacing: 2 },
      { text: `Get started at ${input.facilityName}`, bold: true, fontSize: 24, margin: [0, 8, 0, 4] },
      { text: input.organizationName, color: "#475569", fontSize: 11, margin: [0, 0, 0, 18] },
      { image: input.qrDataUrl, width: 190, alignment: "center", margin: [0, 0, 0, 10] },
      { text: "Scan to register", alignment: "center", bold: true, fontSize: 14 },
      { text: input.registrationUrl, alignment: "center", color: "#475569", fontSize: 8, margin: [0, 4, 0, 22] },
      ...steps,
      { text: "Install directly", bold: true, fontSize: 11, margin: [0, 8, 0, 3] },
      { text: [
        { text: "iPhone: ", bold: true },
        { text: input.appStoreUrl, link: input.appStoreUrl, color: "#1d4ed8" },
      ], fontSize: 9, margin: [0, 0, 0, 3] },
      { text: [
        { text: "Android: ", bold: true },
        { text: input.googlePlayUrl, link: input.googlePlayUrl, color: "#1d4ed8" },
      ], fontSize: 9, margin: [0, 0, 0, 6] },
      { text: "Need help?", bold: true, fontSize: 11, margin: [0, 8, 0, 3] },
      { text: `${input.supportName} · ${input.supportEmail}`, color: "#475569", fontSize: 10 },
    ],
    defaultStyle: { font: "Roboto" },
  };
}
