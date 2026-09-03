const DOCUDENT_PDF_HOST = "docudent-bucket.s3.us-east-2.amazonaws.com";

function hasSignedRequestParameters(url: URL): boolean {
  const keys = new Set(Array.from(url.searchParams.keys(), (key) => key.toLowerCase()));
  return keys.has("x-amz-signature") && keys.has("x-amz-credential");
}

export function parseTrustedPortalPdfUrl(value: unknown): URL | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    if (url.hostname !== DOCUDENT_PDF_HOST) return null;
    if (!url.pathname.startsWith("/orgs/") || !/\/captures\/pdf\/[^/]+\.pdf$/i.test(url.pathname)) return null;
    if (!hasSignedRequestParameters(url)) return null;
    return url;
  } catch {
    return null;
  }
}

export async function proxyPortalPdfDownload(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "A signed PDF URL is required." }, { status: 400 });
  }
  const value = body && typeof body === "object" ? (body as { url?: unknown }).url : null;
  const target = parseTrustedPortalPdfUrl(value);
  if (!target) {
    return Response.json({ error: "The PDF URL is not an approved signed report asset." }, { status: 400 });
  }

  try {
    const upstream = await fetch(target, {
      headers: { accept: "application/pdf" },
      cache: "no-store",
      redirect: "manual",
    });
    if (!upstream.ok) {
      return Response.json({ error: "The report PDF could not be downloaded." }, { status: upstream.status });
    }
    const headers = new Headers({
      "cache-control": "no-store",
      "content-type": upstream.headers.get("content-type") || "application/pdf",
    });
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("content-length", contentLength);
    return new Response(upstream.body, { status: 200, headers });
  } catch {
    return Response.json({ error: "The report PDF download service is unavailable." }, { status: 502 });
  }
}
