import { apiFetch } from "@/lib/apiClient";
import type {
  DeliveryRule,
  DeliveryRuleOptions,
  DeliveryRulePreviewPayload,
} from "@/lib/types";

const DELIVERY_RULES_PATH = "/delivery-rules";

export function fetchDeliveryRules() {
  return apiFetch<{ delivery_rules: DeliveryRule[] }>(DELIVERY_RULES_PATH);
}

export function fetchDeliveryRuleOptions() {
  return apiFetch<DeliveryRuleOptions>(`${DELIVERY_RULES_PATH}/options`);
}

export function createDeliveryRule(payload: Omit<DeliveryRule, "id" | "organizationId" | "source" | "createdAt" | "updatedAt">) {
  return apiFetch<DeliveryRule>(DELIVERY_RULES_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateDeliveryRule(ruleId: string, payload: Partial<Omit<DeliveryRule, "id" | "organizationId" | "source" | "createdAt" | "updatedAt">>) {
  return apiFetch<DeliveryRule>(`${DELIVERY_RULES_PATH}/${encodeURIComponent(ruleId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteDeliveryRule(ruleId: string) {
  return apiFetch<{ success: boolean }>(`${DELIVERY_RULES_PATH}/${encodeURIComponent(ruleId)}`, {
    method: "DELETE",
  });
}

export function evaluateDeliveryRulePreview(payload: DeliveryRulePreviewPayload) {
  return apiFetch<{ matches: unknown[]; count?: number }>(`${DELIVERY_RULES_PATH}/evaluate-preview`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
