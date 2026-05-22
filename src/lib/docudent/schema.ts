// Portal-side mirror of the mobile DocuDent inspection vocabulary.
// Keep this file synchronized with the Flutter/mobile code so parity checks are simple.

import {
  DAMAGE_AREAS,
  DAMAGE_SEVERITIES,
  getDamageTypeOptionsForArea,
} from "@/lib/docudent/damageTaxonomy";

export type DocuDentStepId =
  | "vehicle"
  | "area"
  | "type"
  | "severity"
  | "notes"
  | "files"
  | "review";

export type DocuDentDamageArea = string;

export type DocuDentDamageType = string;

export type DocuDentSeverity = string;

export type DocuDentFormState = {
  vin: string;
  manualIdentifier: string;
  damageArea: DocuDentDamageArea | "";
  damageType: DocuDentDamageType | "";
  severity: DocuDentSeverity | "";
  notes: string;
};

export type AttachmentConstraints = {
  maxFileSize: number;
  acceptedTypes: string[];
};

export type DocuDentStep = {
  id: DocuDentStepId;
  label: string;
  description: string;
};

export const docuDentSteps: DocuDentStep[] = [
  { id: "vehicle", label: "Vehicle", description: "VIN or identifier" },
  { id: "area", label: "Damage area", description: "Choose the impacted zone" },
  { id: "type", label: "Damage type", description: "Describe the impact" },
  { id: "severity", label: "Severity", description: "Risk level" },
  { id: "notes", label: "Notes", description: "Inspection observations" },
  { id: "files", label: "Attachments", description: "Upload supporting files" },
  { id: "review", label: "Review", description: "Confirm details" },
];

export const damageAreas: DocuDentDamageArea[] = [
  ...DAMAGE_AREAS.map((area) => area.code),
];

export const damageTypes: DocuDentDamageType[] = [
  ...Array.from(new Set(DAMAGE_AREAS.flatMap((area) => getDamageTypeOptionsForArea(area.code).map((type) => type.code)))),
];

export const severityLevels: DocuDentSeverity[] = DAMAGE_SEVERITIES.map((severity) => severity.value);

export const requiredFieldsByStep: Record<DocuDentStepId, (keyof DocuDentFormState)[] | null> = {
  vehicle: ["vin", "manualIdentifier"],
  area: ["damageArea"],
  type: ["damageType"],
  severity: ["severity"],
  notes: ["notes"],
  files: [],
  review: [],
};

export const attachmentConstraints: AttachmentConstraints = {
  maxFileSize: 12 * 1024 * 1024,
  acceptedTypes: ["application/pdf", "image/png", "image/jpeg"],
};

export const reviewLabels = {
  vehicle: "Vehicle",
  damageArea: "Damage area",
  damageType: "Damage type",
  severity: "Severity",
  notes: "Notes",
  attachments: "Attachments",
};
