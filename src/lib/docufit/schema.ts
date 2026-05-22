// Portal-side mirror of the DocuFit workflow vocabulary shared with the mobile app.
// Keep the step labels, KPIs, and statuses aligned with the mobile DocuFit terminology.

export type DocuFitStepId = "facility" | "measurements" | "upload" | "review";

export type DocuFitKpiKey = "queue" | "success" | "pending";

export type DocuFitQueueTone = "neutral" | "warning" | "positive" | "danger";

export const docuFitSteps: Array<{ id: DocuFitStepId; label: string; description: string }> = [
  { id: "facility", label: "Facility context", description: "Choose the hub or yard" },
  { id: "measurements", label: "Measurement queue", description: "Review incoming items" },
  { id: "upload", label: "Upload imagery", description: "Push photos instead of capture" },
  { id: "review", label: "Review & sync", description: "Confirm before sending" },
];

export const docuFitKpiLabels: Record<DocuFitKpiKey, string> = {
  queue: "Queue depth",
  success: "Last sync",
  pending: "Pending uploads",
};

export const docuFitQueueStatusTone: Record<string, DocuFitQueueTone> = {
  queued: "warning",
  ready: "positive",
  "needs review": "danger",
  default: "neutral",
};

export const docuFitReviewLabels = {
  notes: "Notes",
  uploads: "Uploaded assets",
  status: "Sync status",
};
