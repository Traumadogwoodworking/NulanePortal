import type {
  InspectionTracQaEvidence,
  InspectionTracVerification
} from "@lib/inspection-trac/types";
import { verificationEvidenceDetails } from "@lib/work/evidence";

export type SubmittedProofCategory =
  | "physical"
  | "automated"
  | "source/build"
  | "other";

export interface SubmittedProof {
  id: string;
  source: "qa" | "task";
  category: SubmittedProofCategory;
  label: string;
  summary: string;
  sourceLabel: string;
  href: string | null;
  capturedAt: string;
}

function classifyQaEvidence(
  evidence: InspectionTracQaEvidence
): SubmittedProofCategory {
  const kind = evidence.evidence_type.toLowerCase();
  if (/(physical|device_execution|field_test|installed_build)/.test(kind)) {
    return "physical";
  }
  if (/(repository|source|build|artifact|static)/.test(kind)) {
    return "source/build";
  }
  if (/(automated|test|contract|runtime|api)/.test(kind)) {
    return "automated";
  }
  return "other";
}

function classifyTaskVerification(test: string): SubmittedProofCategory {
  const normalized = test.toLowerCase();
  if (
    /(physical[- ]device|device execution|device workflow|installed (android|ios|build)|field (test|workflow|run|acceptance))/.test(
      normalized
    )
  ) {
    return "physical";
  }
  if (
    /(source|repository|commit|build|artifact|lint|type.?check|docs?|configuration|doctor|evidence.?pack|yaml|json|static)/.test(
      normalized
    )
  ) {
    return "source/build";
  }
  if (/(test|suite|contract|api|runtime|health|validation)/.test(normalized)) {
    return "automated";
  }
  return "other";
}

function safeTimestamp(value: string) {
  const milliseconds = Date.parse(value);
  return Number.isFinite(milliseconds) ? milliseconds : 0;
}

export function buildSubmittedProofs(
  qaEvidence: InspectionTracQaEvidence[],
  verifications: InspectionTracVerification[]
) {
  const proofs: SubmittedProof[] = [];
  const seen = new Set<string>();

  for (const evidence of qaEvidence) {
    const id = `qa:${evidence.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    proofs.push({
      id,
      source: "qa",
      category: classifyQaEvidence(evidence),
      label: evidence.qa_item_title,
      summary: evidence.summary,
      sourceLabel: `${evidence.qa_item_slug} · ${evidence.evidence_type}`,
      href: null,
      capturedAt: evidence.captured_at
    });
  }

  for (const event of verifications) {
    const details = verificationEvidenceDetails(event);
    if (!details) continue;
    const id = `task:${event.id}`;
    if (seen.has(id)) continue;
    seen.add(id);
    proofs.push({
      id,
      source: "task",
      category: classifyTaskVerification(details.test),
      label: details.test,
      summary: details.result,
      sourceLabel: `${event.task_public_id} · ${event.actor_type} verification`,
      href: `/tasks/${event.task_public_id}`,
      capturedAt: event.created_at
    });
  }

  return proofs.sort(
    (left, right) =>
      safeTimestamp(right.capturedAt) - safeTimestamp(left.capturedAt)
  );
}

export function countSubmittedProofs(proofs: SubmittedProof[]) {
  return {
    total: proofs.length,
    qa: proofs.filter((proof) => proof.source === "qa").length,
    task: proofs.filter((proof) => proof.source === "task").length,
    physical: proofs.filter((proof) => proof.category === "physical").length
  };
}
