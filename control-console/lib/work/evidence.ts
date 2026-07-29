export interface VerificationEvidenceEvent {
  event_type: string;
  payload: Record<string, unknown>;
}

export interface VerificationEvidenceDetails {
  test: string;
  result: string;
}

function nonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function verificationEvidenceDetails(
  event: VerificationEvidenceEvent
): VerificationEvidenceDetails | null {
  if (
    event.event_type !== "verification" &&
    event.event_type !== "status_changed"
  ) {
    return null;
  }

  const test = nonEmptyString(event.payload.test);
  const result = nonEmptyString(event.payload.result);
  return test && result ? { test, result } : null;
}

export function isVerificationEvidenceEvent(
  event: VerificationEvidenceEvent
) {
  return verificationEvidenceDetails(event) !== null;
}

export function countVerificationEvidenceEvents(
  events: VerificationEvidenceEvent[]
) {
  return events.filter(isVerificationEvidenceEvent).length;
}
