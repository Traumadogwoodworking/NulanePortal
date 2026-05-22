import { apiFetch } from "@/lib/apiClient";
import {
  findDamageAreaOption,
  findDamageTypeOption,
} from "@/lib/docudent/damageTaxonomy";
import type { DocuDentFormState } from "@/lib/docudent/schema";
import type { UploadSummary } from "@/lib/docudent/uploadAttachments";

type DocuDentSubmissionResponse = {
  report_id?: string;
  reportId?: string;
  report?: { report_id?: string; reportId?: string };
};

export type SubmitInspectionResult = {
  reportId: string;
  attachments?: UploadSummary;
};

type DocuDentDamageEntry = {
  damage_area_name?: string;
  damage_type_name?: string;
  severity_level?: number | null;
  severity?: number | null;
  comments?: string;
  notes?: string;
};

type DocuDentSubmissionPayload = {
  report_id: string;
  vin?: string;
  metadata: Record<string, string>;
  comments?: string;
  damage_entries?: DocuDentDamageEntry[];
  photo_urls?: string[];
  pdf_url?: string;
};

function buildDamageEntry(formState: DocuDentFormState) {
  const { damageArea, damageType, severity, notes } = formState;
  if (!damageArea && !damageType && !severity && !notes) return null;
  const severityLevel = Number.parseInt(severity, 10);
  const areaOption = findDamageAreaOption(damageArea);
  const typeOption = findDamageTypeOption(damageArea, damageType);
  return {
    damage_area_code: areaOption?.code || damageArea || undefined,
    damage_area_name: areaOption?.name || damageArea || undefined,
    damage_type_code: typeOption?.code || damageType || undefined,
    damage_type_name: typeOption?.name || damageType || undefined,
    severity_level: Number.isFinite(severityLevel) ? severityLevel : null,
    severity: Number.isFinite(severityLevel) ? severityLevel : null,
    comments: notes || undefined,
    notes: notes || undefined,
  };
}

export type SubmitInspectionOptions = {
  reportId?: string;
  attachments?: UploadSummary;
};

export async function submitInspection(
  formState: DocuDentFormState,
  options?: SubmitInspectionOptions,
): Promise<SubmitInspectionResult> {
  const reportId = deriveReportId(options?.reportId);
  const payload: DocuDentSubmissionPayload = {
    report_id: reportId,
    vin: formState.vin || undefined,
    metadata: {},
    comments: formState.notes || undefined,
  };

  if (formState.manualIdentifier) {
    payload.metadata.manual_identifier = formState.manualIdentifier;
  }

  const damageEntry = buildDamageEntry(formState);
  if (damageEntry) {
    payload.damage_entries = [damageEntry];
  }

  if (options?.attachments?.photoUrls?.length) {
    payload.photo_urls = options.attachments.photoUrls;
  }
  if (options?.attachments?.pdfUrls?.length) {
    payload.pdf_url = options.attachments.pdfUrls[0];
  }

  const response = await apiFetch<DocuDentSubmissionResponse>("/reports", {
    method: "POST",
    headers: {
      "x-portal-request": "true",
    },
    body: JSON.stringify(payload),
  });

  const responseReportId =
    response.report_id || response.reportId || response.report?.report_id || "";
  return {
    reportId: responseReportId,
    attachments: options?.attachments,
  };
}

export function deriveReportId(provided?: string): string {
  const candidate = provided?.trim();
  if (candidate) return candidate;
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
