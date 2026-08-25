import { NextRequest, NextResponse } from "next/server";

export const DEFINIAN_SIGNAL_RETURN_URL = "https://www.definian.com/signal";

export function buildDefinianStartLoginUrl(requestUrl: string) {
  const request = new URL(requestUrl);
  const loginUrl = new URL("/login/", request.origin);
  loginUrl.searchParams.set("returnTo", DEFINIAN_SIGNAL_RETURN_URL);
  return loginUrl;
}

export function GET(request: NextRequest) {
  return NextResponse.redirect(buildDefinianStartLoginUrl(request.url), 307);
}
