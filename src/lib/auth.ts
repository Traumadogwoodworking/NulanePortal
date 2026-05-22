import { UserSummary } from "./types";

export interface SessionState {
  isAuthenticated: boolean;
  user?: UserSummary;
  accessToken: string | null;
}

const sessionState: SessionState = {
  isAuthenticated: false,
  accessToken: null,
};

export async function initializeAuthSession(user?: UserSummary): Promise<SessionState> {
  if (user) {
    sessionState.user = user;
    sessionState.isAuthenticated = true;
    sessionState.accessToken = user.permissions.includes("portal.admin") ? "mock-token" : null;
  }
  return sessionState;
}

export function updateAuthUser(user: UserSummary) {
  sessionState.user = user;
  sessionState.isAuthenticated = true;
  return sessionState;
}

export function clearAuthSession() {
  sessionState.user = undefined;
  sessionState.accessToken = null;
  sessionState.isAuthenticated = false;
}

export function getAuthSession() {
  return sessionState;
}
