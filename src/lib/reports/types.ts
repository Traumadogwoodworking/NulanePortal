import type { PortalSessionResponse } from "@/lib/types";
import type { ReportDamageApiRow, RsaReportApiRow } from "@/lib/types";

export type ReportActionRow = ReportDamageApiRow | RsaReportApiRow;
export type ReportActionType = "damage" | "rsa";

export interface ReportPdfActionOptions {
  report: ReportActionRow;
  reportId: string;
  reportType: ReportActionType;
  session: PortalSessionResponse | null;
}

export interface ReportPhotoActionOptions {
  report: ReportActionRow;
  reportId: string;
}
