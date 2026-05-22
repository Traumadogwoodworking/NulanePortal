export interface AuthenticatedSession {
  email: string;
  name?: string;
  roles: string[];
}

const ADMIN_EMAILS = (process.env.CONTROL_CONSOLE_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);

export function isControlConsoleAdmin(session?: AuthenticatedSession): boolean {
  if (!session) {
    return false;
  }

  if (session.roles.includes("control-console-admin")) {
    return true;
  }

  return ADMIN_EMAILS.length ? ADMIN_EMAILS.includes(session.email.toLowerCase()) : false;
}

export function buildAuth0LoginUrl(): string {
  const domain = process.env.AUTH0_DOMAIN;
  const clientId = process.env.AUTH0_CLIENT_ID;
  const redirectUri = process.env.CONTROL_CONSOLE_REDIRECT_URI ?? "http://localhost:3000/api/auth/callback";

  if (!domain || !clientId) {
    return "/api/auth/login";
  }

  const params = new URLSearchParams({
    response_type: "code",
    scope: "openid profile email",
    response_mode: "form_post",
    client_id: clientId,
    redirect_uri: redirectUri
  });

  return `https://${domain}/authorize?${params.toString()}`;
}
