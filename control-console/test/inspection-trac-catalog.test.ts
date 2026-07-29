import assert from "node:assert/strict";
import test from "node:test";
import {
  INSPECTION_TRAC_SHAP_MODULES,
  SHAP_MODULE_EVIDENCE_STATES
} from "../lib/inspection-trac/catalog";

test("Inspection Trac keeps every requested SHAP readiness surface visible", () => {
  assert.deepEqual(INSPECTION_TRAC_SHAP_MODULES, [
    "Damage Submission", "RSA", "24-Hour Inspection", "Type 02", "Type 04",
    "Type 06", "Type 07", "Type 08", "9x / generic"
  ]);
});

test("unknown configuration cannot be represented as field readiness", () => {
  assert.equal(SHAP_MODULE_EVIDENCE_STATES.configured, "UNKNOWN");
  assert.ok(Object.entries(SHAP_MODULE_EVIDENCE_STATES)
    .filter(([key]) => key !== "configured")
    .every(([, state]) => state === "BLOCKED"));
});
