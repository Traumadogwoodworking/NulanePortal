export const DEFINIAN_SIGNAL_PARENT_ORIGIN = "https://www.definian.com";
export const DEFINIAN_SIGNAL_PARENT_URL = `${DEFINIAN_SIGNAL_PARENT_ORIGIN}/inspection`;
export const DEFINIAN_SIGNAL_EMBED_PATH = "/embed/definian-signal/";
export const DEFINIAN_SIGNAL_PORTAL_ORIGIN = "https://signal.definian.com";

export function resolveDefinianSignalParentReturnTo(value?: string | null): string | null {
  const candidate = (value || "").trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate);
    const normalizedPath = parsed.pathname.replace(/\/+$/, "") || "/";
    const approvedPath = new URL(DEFINIAN_SIGNAL_PARENT_URL).pathname;
    if (
      parsed.origin === DEFINIAN_SIGNAL_PARENT_ORIGIN &&
      normalizedPath === approvedPath &&
      !parsed.search &&
      !parsed.hash &&
      !parsed.username &&
      !parsed.password
    ) {
      return DEFINIAN_SIGNAL_PARENT_URL;
    }
  } catch {
    return null;
  }

  return null;
}
