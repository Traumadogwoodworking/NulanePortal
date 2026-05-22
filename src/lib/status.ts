import type { ReportSummary } from "./types";

export type StatusTone = "positive" | "warning" | "danger" | "neutral";

export function toneForReportStatus(status: ReportSummary["status"]): StatusTone {
  switch (status) {
    case "open":
      return "warning";
    case "review":
      return "warning";
    case "closed":
      return "positive";
    default:
      return "neutral";
  }
}

export function toneForFacility(facilityActive: boolean): StatusTone {
  return facilityActive ? "positive" : "danger";
}

export function toneForRoleStatus(status: "active" | "archived"): StatusTone {
  return status === "active" ? "positive" : "danger";
}

