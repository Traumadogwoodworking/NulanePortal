import { apiFetch } from "@/lib/apiClient";
import type {
  DeliveryRule,
  DeliveryRuleOptions,
  DeliveryRulePreviewPayload,
} from "@/lib/types";

const DELIVERY_RULES_PATH = "/delivery-rules";

function normalizeEmailArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .filter((entry): entry is string => typeof entry === "string")
          .map((entry) => entry.trim().toLowerCase())
          .filter(Boolean)
      )
    );
  }
  if (typeof value === "string") {
    return normalizeEmailArray(value.split(/[\n,;]/));
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return normalizeEmailArray(record.emails ?? record.addresses ?? record.recipients);
  }
  return [];
}

export function normalizeDeliveryRule(value: unknown): DeliveryRule | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const actions =
    record.actions && typeof record.actions === "object" && !Array.isArray(record.actions)
      ? (record.actions as Record<string, unknown>)
      : {};
  return {
    ...(record as unknown as DeliveryRule),
    actions: {
      cc: normalizeEmailArray(actions.cc ?? record.cc ?? record.cc_emails),
      bcc: normalizeEmailArray(actions.bcc ?? record.bcc ?? record.bcc_emails),
    },
  };
}

function normalizeDeliveryRuleResponse(value: unknown): DeliveryRule {
  const rule = normalizeDeliveryRule(value);
  if (!rule) {
    throw new Error("Unexpected delivery rule response shape.");
  }
  return rule;
}

export async function fetchDeliveryRules(): Promise<{ delivery_rules: DeliveryRule[] }> {
  const payload = await apiFetch<unknown>(DELIVERY_RULES_PATH);
  const record =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  const rows = Array.isArray(record.delivery_rules)
    ? record.delivery_rules
    : Array.isArray(record.rules)
      ? record.rules
      : [];
  return {
    delivery_rules: rows
      .map(normalizeDeliveryRule)
      .filter((rule): rule is DeliveryRule => Boolean(rule)),
  };
}

export function fetchDeliveryRuleOptions() {
  return apiFetch<DeliveryRuleOptions>(`${DELIVERY_RULES_PATH}/options`);
}

export async function createDeliveryRule(payload: Omit<DeliveryRule, "id" | "organizationId" | "source" | "createdAt" | "updatedAt">) {
  const response = await apiFetch<unknown>(DELIVERY_RULES_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return normalizeDeliveryRuleResponse(response);
}

export async function updateDeliveryRule(ruleId: string, payload: Partial<Omit<DeliveryRule, "id" | "organizationId" | "source" | "createdAt" | "updatedAt">>) {
  const response = await apiFetch<unknown>(`${DELIVERY_RULES_PATH}/${encodeURIComponent(ruleId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return normalizeDeliveryRuleResponse(response);
}

export async function deleteDeliveryRule(ruleId: string): Promise<{ delivery_rules: DeliveryRule[] }> {
  await apiFetch<unknown>(`${DELIVERY_RULES_PATH}/${encodeURIComponent(ruleId)}`, {
    method: "DELETE",
  });
  const refreshed = await fetchDeliveryRules();
  if (refreshed.delivery_rules.some((rule) => rule.id === ruleId)) {
    throw new Error("The server did not delete this delivery rule. It is still present after refresh.");
  }
  return refreshed;
}

export function evaluateDeliveryRulePreview(payload: DeliveryRulePreviewPayload) {
  return apiFetch<{ matches: unknown[]; count?: number }>(`${DELIVERY_RULES_PATH}/evaluate-preview`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
