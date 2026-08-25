const HOP_BY_HOP_REQUEST_HEADERS = [
  "connection",
  "content-length",
  "host",
  "origin",
  "referer",
  "transfer-encoding",
];

const HOP_BY_HOP_RESPONSE_HEADERS = [
  "connection",
  "content-length",
  "content-encoding",
  "transfer-encoding",
  "access-control-allow-origin",
  "access-control-allow-credentials",
  "access-control-allow-headers",
  "access-control-allow-methods",
];

const DEFINIAN_PORTAL_BRANDING_PRESETS = new Set(["definian", "definianinspection"]);
const DEFINIAN_PORTAL_REFERRER = "https://www.definian.com/signal";

export function buildPortalUpstreamUrl(
  upstreamBase: string,
  path: readonly string[],
  search = "",
): URL {
  const normalizedBase = upstreamBase.endsWith("/") ? upstreamBase : `${upstreamBase}/`;
  const target = new URL(path.map(encodeURIComponent).join("/"), normalizedBase);
  target.search = search;
  return target;
}

function getPortalApiUpstream(): string {
  const upstream = (process.env.PORTAL_API_UPSTREAM || "").trim();
  if (!upstream) {
    throw new Error("PORTAL_API_UPSTREAM is required for the same-origin portal API proxy.");
  }
  const parsed = new URL(upstream);
  if (parsed.protocol !== "https:" && parsed.hostname !== "localhost" && parsed.hostname !== "127.0.0.1") {
    throw new Error("PORTAL_API_UPSTREAM must use HTTPS unless it targets localhost.");
  }
  return parsed.toString();
}

export function buildPortalUpstreamRequestHeaders(
  request: Request,
  requestId: string,
  brandingPreset = process.env.NEXT_PUBLIC_PORTAL_BRANDING || "",
): Headers {
  const headers = new Headers(request.headers);
  for (const name of HOP_BY_HOP_REQUEST_HEADERS) headers.delete(name);
  for (const name of ["x-portal-access", "x-portal-request", "x-portal-tenant"]) headers.delete(name);
  headers.set("x-portal-request-id", requestId);
  headers.set("accept-encoding", "identity");
  if (DEFINIAN_PORTAL_BRANDING_PRESETS.has(brandingPreset.trim().toLowerCase())) {
    headers.set("x-portal-request", "1");
    headers.set("x-portal-tenant", "definian");
    headers.set("referer", DEFINIAN_PORTAL_REFERRER);
  }
  return headers;
}

function responseHeaders(upstreamResponse: Response, requestId: string): Headers {
  const headers = new Headers(upstreamResponse.headers);
  for (const name of HOP_BY_HOP_RESPONSE_HEADERS) headers.delete(name);
  headers.set("x-portal-request-id", requestId);
  headers.set("cache-control", headers.get("cache-control") || "no-store");
  return headers;
}

export async function proxyPortalApiRequest(request: Request, path: readonly string[]): Promise<Response> {
  const requestId = request.headers.get("x-portal-request-id") || crypto.randomUUID();
  try {
    const target = buildPortalUpstreamUrl(getPortalApiUpstream(), path, new URL(request.url).search);
    console.info("[portal-api-proxy] start", {
      requestId,
      method: request.method,
      path: `/${path.join("/")}`,
      upstreamHost: target.host,
    });

    const hasBody = request.method !== "GET" && request.method !== "HEAD";
    const upstreamResponse = await fetch(target, {
      method: request.method,
      headers: buildPortalUpstreamRequestHeaders(request, requestId),
      body: hasBody ? await request.arrayBuffer() : undefined,
      cache: "no-store",
      redirect: "manual",
    });

    console.info("[portal-api-proxy] complete", {
      requestId,
      method: request.method,
      path: `/${path.join("/")}`,
      status: upstreamResponse.status,
    });
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders(upstreamResponse, requestId),
    });
  } catch (error) {
    console.error("[portal-api-proxy] failed", {
      requestId,
      method: request.method,
      path: `/${path.join("/")}`,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json(
      { error: "Portal API proxy unavailable.", requestId },
      { status: 502, headers: { "cache-control": "no-store", "x-portal-request-id": requestId } },
    );
  }
}
