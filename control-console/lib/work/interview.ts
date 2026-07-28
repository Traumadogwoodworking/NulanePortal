export interface InterviewStep {
  fieldKey: string;
  prompt: string;
  recommendedAnswer: string;
}

export const FEATURE_INTERVIEW: InterviewStep[] = [
  {
    fieldKey: "outcome",
    prompt: "What concrete outcome should this feature produce for the person using it?",
    recommendedAnswer:
      "Describe one observable user result, not an implementation or technology choice."
  },
  {
    fieldKey: "current_behavior",
    prompt: "What happens today, and where in the real product or workflow does it happen?",
    recommendedAnswer:
      "Name the current screen, service, repository path, request, or manual step and include the failure or friction."
  },
  {
    fieldKey: "desired_behavior",
    prompt: "What should happen instead, from the user’s first action through the final result?",
    recommendedAnswer:
      "Describe the end-to-end happy path in plain language and keep existing working behavior unless explicitly replaced."
  },
  {
    fieldKey: "users_and_context",
    prompt: "Who uses this, on which device or role, and under what real operating conditions?",
    recommendedAnswer:
      "Identify the primary role, device class, connectivity assumptions, and any field or production constraints."
  },
  {
    fieldKey: "scope_boundaries",
    prompt: "What is explicitly in scope, and what must not be changed?",
    recommendedAnswer:
      "Name the allowed repository/module and list backend, frontend, deployment, or data boundaries that must remain untouched."
  },
  {
    fieldKey: "data_and_integrations",
    prompt: "Which real data sources, APIs, documents, devices, or external systems does this feature depend on?",
    recommendedAnswer:
      "Use authoritative sources only; mark missing contracts as blockers rather than inventing mock production behavior."
  },
  {
    fieldKey: "failure_behavior",
    prompt: "What should the user see and what should the system retain when a dependency, upload, test, or submission fails?",
    recommendedAnswer:
      "Fail visibly, retain recoverable work, distinguish retryable from permanent failures, and never report success before the authoritative step succeeds."
  },
  {
    fieldKey: "acceptance_criteria",
    prompt: "What exact conditions must be true for you to call this feature finished?",
    recommendedAnswer:
      "List observable behaviors, required data, error handling, supported roles/devices, and any visual or contract details that must match."
  },
  {
    fieldKey: "verification",
    prompt: "What evidence is required—tests, device proof, API response, deployment check, screenshot, or user confirmation?",
    recommendedAnswer:
      "Require verification proportional to risk and do not treat a local build as proof of production, device, or backend behavior."
  },
  {
    fieldKey: "rollout_and_rollback",
    prompt: "How should this be released, monitored, and rolled back if the result is wrong?",
    recommendedAnswer:
      "Use the existing CI/deployment path, name the last-known-good release source, define a smoke check, and keep rollback approval-gated."
  },
  {
    fieldKey: "definition_of_done",
    prompt: "What final handoff should be recorded so another Codex run or person can continue without reconstructing context?",
    recommendedAnswer:
      "Record changed files, decisions, tests and evidence, branch or commit, deployment state, remaining risks, and the next action."
  }
];

