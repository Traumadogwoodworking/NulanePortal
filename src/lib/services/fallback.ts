export async function withMockFallback<T>(attempt: () => Promise<T>, fallback: T, label: string): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    console.warn(`Fallback for ${label} used; returning mock data.`, error);
    return fallback;
  }
}
