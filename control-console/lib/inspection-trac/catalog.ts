export const INSPECTION_TRAC_SHAP_MODULES = [
  "Damage Submission",
  "RSA",
  "24-Hour Inspection",
  "Type 02",
  "Type 04",
  "Type 06",
  "Type 07",
  "Type 08",
  "9x / generic"
] as const;

export const SHAP_MODULE_EVIDENCE_STATES = {
  configured: "UNKNOWN",
  android: "BLOCKED",
  ios: "BLOCKED",
  draftResume: "BLOCKED",
  scanner: "BLOCKED",
  submission: "BLOCKED",
  backend: "BLOCKED",
  portal: "BLOCKED"
} as const;
