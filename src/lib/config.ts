// Monolith reference values (see `DEFAULT_API_BASE`, `DEFAULT_DOCUFIT_API_BASE`, and
// `DEFAULT_DOCUDENT_EMBED_URL` in the inline script).
const DEFAULT_API_BASE = "https://api.nulanesystems.com/api";
const PORTAL_API_PROXY_BASE = "/api/portal";
const DEFAULT_DOCUFIT_API_BASE = "/docufit";
const DEFAULT_DOCUDENT_EMBED_URL = "https://nulanesystems.com/portal/app/index.html";
const DEFAULT_DOCUFIT_EMBED_URL = "https://nulanesystems.com/portal/app/docufit/index.html";

export function normalizeBaseUrl(value?: string | null): string | null {
  if (!value || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.replace(/\/+$/, "");
}

const envPortalBasePath = normalizeBaseUrl(process.env.NEXT_PUBLIC_PORTAL_BASE_PATH || process.env.NEXT_PUBLIC_BASE_PATH);
const defaultPortalBasePath = "";

/** Definian may reach the canonical production API through its trusted same-origin proxy. */
const selectApiBase = () => {
  if (normalizeBaseUrl(process.env.NEXT_PUBLIC_PORTAL_API_BASE) === PORTAL_API_PROXY_BASE) {
    return PORTAL_API_PROXY_BASE;
  }
  return DEFAULT_API_BASE;
};

const selectedApiBase = selectApiBase();

export const portalConfig = {
  apiBase: selectedApiBase,
  usesDefaultApiBase: selectedApiBase === DEFAULT_API_BASE,
  docuFitBase: normalizeBaseUrl(process.env.NEXT_PUBLIC_DOCUFIT_BASE) ?? DEFAULT_DOCUFIT_API_BASE,
  docuDentEmbedUrl:
    normalizeBaseUrl(process.env.NEXT_PUBLIC_DOCUDENT_EMBED_URL) ?? DEFAULT_DOCUDENT_EMBED_URL,
  docuFitEmbedUrl:
    normalizeBaseUrl(process.env.NEXT_PUBLIC_DOCUFIT_EMBED_URL) ?? DEFAULT_DOCUFIT_EMBED_URL,
  supportFormUrl:
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SUPPORT_FORM_URL),
  ledecAlertRecipients: process.env.NEXT_PUBLIC_LEDEC_ALERT_RECIPIENTS?.split(",") || [],
  ledecLateThresholdMinutes: parseInt(process.env.NEXT_PUBLIC_LEDEC_LATE_THRESHOLD_MINUTES || "15", 10),
  environment: process.env.NODE_ENV ?? "development",
};

export function buildApiUrl(path: string): string {
  const trimmed = path.replace(/^\/+/, "");
  const normalizedPath =
    (portalConfig.apiBase.endsWith("/api") || portalConfig.apiBase === PORTAL_API_PROXY_BASE) &&
    trimmed.startsWith("api/")
      ? trimmed.replace(/^api\//, "")
      : trimmed;
  return `${portalConfig.apiBase}/${normalizedPath}`.replace(/\/+$/g, "");
}

export function buildDocuFitUrl(path: string): string {
  const trimmed = path.replace(/^\/+/, "");
  return `${portalConfig.docuFitBase}/${trimmed}`.replace(/\/+$/g, "");
}

export const derivedRoutes = {
  reports: "/reports",
  dashboard: "/",
  docuDent: "/docudent",
  docuFit: "/docufit",
};

export function getDocuDentEmbedUrl(): string {
  return portalConfig.docuDentEmbedUrl;
}

export function getDocuFitEmbedUrl(): string {
  return portalConfig.docuFitEmbedUrl;
}

export function parseEmbedUrl(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  try {
    return new URL(raw).toString();
  } catch {
    return null;
  }
}

/** Returns a validated DocuDent iframe source or null when configuration is invalid. */
export function resolveDocuDentEmbedUrl(): string | null {
  return parseEmbedUrl(portalConfig.docuDentEmbedUrl);
}

/** Returns a validated DocuFit iframe source or null when configuration is invalid. */
export function resolveDocuFitEmbedUrl(): string | null {
  return parseEmbedUrl(portalConfig.docuFitEmbedUrl);
}

export function getDocuFitBase(): string {
  return portalConfig.docuFitBase;
}

export function normalizeMediaUrl(url: string | null | undefined): string {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    const sanitized = url.replace(/^\/+/, "");
    return `/${sanitized}`;
}

export function withPortalBasePath(path: string): string {
  if (!path) {
    return path;
  }
  if (path.startsWith("http")) {
    return path;
  }
  const sanitized = path.replace(/^\/+/, "");
  const basePath = envPortalBasePath || defaultPortalBasePath;
  return basePath ? `${basePath}/${sanitized}` : `/${sanitized}`;
}
