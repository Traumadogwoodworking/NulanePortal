import { NextResponse } from "next/server";
import { resolveDevMockResponse } from "@/lib/devMockApi";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [];
}

async function handle(request: Request, init?: RequestInit) {
  const mock = await resolveDevMockResponse(request.url, init);
  if (mock !== null) {
    return NextResponse.json(mock);
  }

  const requestUrl = new URL(request.url);
  const upstreamRoot = (process.env.NEXT_PUBLIC_DOCUDENT_API_BASE_URL || "https://api.nulanesystems.com").trim().replace(/\/+$/, "");
  const upstreamBase = upstreamRoot.endsWith("/api") ? upstreamRoot : `${upstreamRoot}/api`;
  const targetPath = upstreamRoot.endsWith("/api") ? requestUrl.pathname.replace(/^\/api/, "") : requestUrl.pathname;
  const targetUrl = new URL(`${targetPath}${requestUrl.search}`, `${upstreamBase}/`);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (key === "host" || key === "content-length") {
      return;
    }
    headers.set(key, value);
  });

  const hasBody = !["GET", "HEAD"].includes(request.method.toUpperCase());
  const response = await fetch(targetUrl, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const proxyHeaders = new Headers(response.headers);
  proxyHeaders.delete("content-encoding");
  proxyHeaders.delete("content-length");
  proxyHeaders.delete("transfer-encoding");
  proxyHeaders.delete("connection");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: proxyHeaders,
  });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request, { method: "POST" });
}

export async function PUT(request: Request) {
  return handle(request, { method: "PUT" });
}

export async function PATCH(request: Request) {
  return handle(request, { method: "PATCH" });
}

export async function DELETE(request: Request) {
  return handle(request, { method: "DELETE" });
}
