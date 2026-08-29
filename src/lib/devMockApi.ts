/**
 * The isolated DocuDent portal always exercises the authenticated API boundary.
 * In-browser response mocks are intentionally disabled so review builds cannot
 * inherit customer fixtures, tenant defaults, or alternate-product endpoints.
 */
export function isDevMockEnabled(): boolean {
  return false;
}

export function installDevFetchMock(): void {
  // Intentionally inert. Keep the compatibility export for existing services.
}

export async function resolveDevMockResponse(
  _url: string,
  _init: RequestInit = {},
): Promise<null> {
  return null;
}
