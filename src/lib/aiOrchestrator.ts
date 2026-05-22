export type AiChatPayload = {
  question: string;
  organizationId: string;
  locationId?: string | null;
  userId?: string;
};

export type AiChatResponse = {
  answer: string;
  sources?: unknown[];
  diagnostics?: Record<string, unknown>;
};

export async function handleChat(payload: AiChatPayload): Promise<AiChatResponse> {
  // Minimal stub for portal API usage. Replace with a real orchestrator when wiring backend services.
  return {
    answer: `Mocked OTTO answer for ${payload.question}`,
    sources: [],
    diagnostics: { mode: "mock", timestamp: new Date().toISOString() },
  };
}

export const aiOrchestrator = {
  handleChat,
};
