import { NextResponse } from "next/server";

export const DEFINIAN_SIGNAL_RETURN_URL = "https://www.definian.com/signal";
export const DEFINIAN_AUTH_BOOTSTRAP_ORIGIN = "https://vercel-portal-exact.vercel.app";

export function buildDefinianStartLoginUrl() {
  const loginUrl = new URL("/signup/", DEFINIAN_AUTH_BOOTSTRAP_ORIGIN);
  loginUrl.searchParams.set("returnTo", DEFINIAN_SIGNAL_RETURN_URL);
  return loginUrl;
}

export function GET() {
  return NextResponse.redirect(buildDefinianStartLoginUrl(), 307);
}
