import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SubmittedEvidencePanel } from "../components/inspection-trac/SubmittedEvidencePanel";
import {
  buildSubmittedProofs,
  countSubmittedProofs
} from "../lib/inspection-trac/evidence";
import type {
  InspectionTracQaEvidence,
  InspectionTracVerification
} from "../lib/inspection-trac/types";

const qaEvidence: InspectionTracQaEvidence = {
  id: "qa-1",
  qa_item_id: "item-1",
  qa_item_slug: "duplicate-prevention",
  qa_item_title: "Duplicate prevention",
  evidence_type: "automated_test",
  summary: "Duplicate submission contract passed.",
  build_device: null,
  tester: "codex",
  captured_at: "2026-07-29T12:00:00.000Z",
  created_at: "2026-07-29T12:00:00.000Z"
};

const verification: InspectionTracVerification = {
  id: "event-1",
  event_type: "status_changed",
  actor_type: "cli",
  payload: {
    from: "working",
    to: "verifying",
    test: "Portal build",
    result: "Production build completed."
  },
  created_at: "2026-07-29T13:00:00.000Z",
  task_public_id: "INS-001"
};

test("submitted proof model deduplicates records and ignores legacy progress twins", () => {
  const proofs = buildSubmittedProofs(
    [qaEvidence, qaEvidence],
    [
      verification,
      {
        ...verification,
        id: "event-progress",
        event_type: "progress",
        payload: {
          message: "Verification: Portal build",
          result: "Production build completed."
        }
      }
    ]
  );
  assert.deepEqual(countSubmittedProofs(proofs), {
    total: 2,
    qa: 1,
    task: 1,
    physical: 0
  });
  assert.deepEqual(
    proofs.map((proof) => proof.category),
    ["source/build", "automated"]
  );
});

test("submitted evidence renders proof, source, timestamp, and task link without disclosure clicks", () => {
  const html = renderToStaticMarkup(
    React.createElement(SubmittedEvidencePanel, {
      qaEvidence: [qaEvidence],
      verifications: [verification]
    })
  );

  assert.match(html, /What is proven \/ submitted evidence/);
  assert.match(html, /2 durable proof records/);
  assert.match(html, /Duplicate submission contract passed/);
  assert.match(html, /Production build completed/);
  assert.match(html, /duplicate-prevention · automated_test/);
  assert.match(html, /href="\/tasks\/INS-001"/);
  assert.match(html, /Jul 29, 2026/);
  assert.doesNotMatch(html, /<details/);
});
