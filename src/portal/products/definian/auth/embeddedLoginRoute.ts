import { NextResponse } from "next/server";

const DEFAULT_AUTH0_DOMAIN = "nulanesystems.us.auth0.com";
const DEFINIAN_AUTH0_ORGANIZATION_ID = "org_GRicZ7Jqg1r3aerr";

function maskEmail(value: string) {
  const [localPart, domain] = value.split("@");
  return domain ? `${localPart.slice(0, 2)}***@${domain}` : "***";
}

function safeReturnTo(value: string | undefined) {
  const candidate = (value || "").trim();
  return candidate.startsWith("/") && !candidate.startsWith("//") ? candidate : "/home/";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string; returnTo?: string };
    const email = (body.email || "").trim();
    const password = body.password || "";
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    const configuredUpstream = (process.env.DEFINIAN_EMBEDDED_LOGIN_UPSTREAM || "").trim();
    if (configuredUpstream) {
      const upstreamUrl = new URL(configuredUpstream);
      if (upstreamUrl.protocol !== "https:") {
        console.error("[embedded-login] configured upstream must use HTTPS");
        return NextResponse.json({ error: "Embedded login is not configured." }, { status: 500 });
      }
      console.info("[embedded-login] forwarding token exchange to configured Definian upstream", {
        host: upstreamUrl.host,
        maskedEmail: maskEmail(email),
      });
      const upstreamResponse = await fetch(upstreamUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ email, password, returnTo: safeReturnTo(body.returnTo) }),
      });
      const upstreamPayload = (await upstreamResponse.json()) as Record<string, unknown>;
      return NextResponse.json(upstreamPayload, {
        status: upstreamResponse.status,
        headers: { "Cache-Control": "no-store" },
      });
    }

    const domain = (process.env.AUTH0_DOMAIN || process.env.NEXT_PUBLIC_AUTH0_DOMAIN || DEFAULT_AUTH0_DOMAIN).trim();
    const clientId = (process.env.AUTH0_CLIENT_ID || process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID || "").trim();
    const clientSecret = (process.env.AUTH0_CLIENT_SECRET || "").trim();
    const realm = (process.env.AUTH0_DATABASE_CONNECTION || "").trim();
    const audience = (process.env.AUTH0_AUDIENCE || process.env.NEXT_PUBLIC_AUTH0_AUDIENCE || "").trim();
    const organization = (process.env.AUTH0_ORGANIZATION_ID || process.env.NEXT_PUBLIC_AUTH0_ORGANIZATION_ID || DEFINIAN_AUTH0_ORGANIZATION_ID).trim();

    if (!clientId || !clientSecret || !realm || !audience) {
      console.error("[embedded-login] missing required configuration", {
        hasClientId: Boolean(clientId),
        hasClientSecret: Boolean(clientSecret),
        hasRealm: Boolean(realm),
        hasAudience: Boolean(audience),
      });
      return NextResponse.json({ error: "Embedded login is not configured." }, { status: 500 });
    }

    const tokenResponse = await fetch(`https://${domain}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        grant_type: "http://auth0.com/oauth/grant-type/password-realm",
        username: email,
        password,
        client_id: clientId,
        client_secret: clientSecret,
        realm,
        audience,
        organization,
        scope: "openid profile email offline_access",
      }),
    });

    const payload = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
      error_description?: string;
    };
    if (!tokenResponse.ok || !payload.access_token) {
      console.warn("[embedded-login] Auth0 token exchange failed", {
        status: tokenResponse.status,
        maskedEmail: maskEmail(email),
        errorCode: payload.error,
      });
      return NextResponse.json(
        { error: payload.error_description || payload.error || "Unable to authenticate." },
        { status: tokenResponse.status || 401 },
      );
    }

    return NextResponse.json(
      { ok: true, accessToken: payload.access_token, returnTo: safeReturnTo(body.returnTo) },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[embedded-login] unexpected error", error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: "Unable to authenticate." }, { status: 500 });
  }
}
