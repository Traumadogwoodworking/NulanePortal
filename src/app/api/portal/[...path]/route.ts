import { proxyPortalApiRequest } from "@/portal/core/server/portalApiProxy";

type PortalProxyContext = {
  params: Promise<{ path: string[] }>;
};

async function handle(request: Request, context: PortalProxyContext) {
  const { path } = await context.params;
  return proxyPortalApiRequest(request, path);
}

export const dynamic = "force-dynamic";
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
export const OPTIONS = handle;
export const HEAD = handle;
