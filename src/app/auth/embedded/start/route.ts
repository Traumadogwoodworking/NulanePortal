import { NextRequest, NextResponse } from "next/server";
import { DEFINIAN_SIGNAL_PARENT_URL } from "@/portal/products/definian/auth/embeddedAuth";

const AUTH_ROUTE_BY_ACTION = {
  login: "/login",
  signup: "/signup",
  logout: "/logout",
} as const;

export function GET(request: NextRequest) {
  const requestedAction = request.nextUrl.searchParams.get("action") || "login";
  const action = requestedAction in AUTH_ROUTE_BY_ACTION
    ? (requestedAction as keyof typeof AUTH_ROUTE_BY_ACTION)
    : "login";
  const destination = new URL(AUTH_ROUTE_BY_ACTION[action], request.nextUrl.origin);
  destination.searchParams.set("returnTo", DEFINIAN_SIGNAL_PARENT_URL);
  return NextResponse.redirect(destination, 307);
}
