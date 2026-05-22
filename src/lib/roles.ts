type RoleLikeSession = {
  user?: {
    role?: string | null;
  } | null;
  isSuperAdmin?: boolean;
  isOrgAdmin?: boolean;
  isAdmin?: boolean;
};

// Role constants
export const ROLE_SUPER_ADMIN = "super_admin";
export const ROLE_ADMIN = "admin";
export const ROLE_ORG_ADMIN = "org_admin";
export const ROLE_FACILITY_ADMIN = "facility_admin"; // Not yet in use, but defined for future
export const ROLE_USER = "user";
export const ROLE_VIEWER = "viewer";

// Helper functions
export function isSuperAdmin(session: RoleLikeSession | null): boolean {
  return session?.isSuperAdmin ?? false;
}

export function isOrgAdmin(session: RoleLikeSession | null): boolean {
  return session?.isOrgAdmin ?? false;
}

export function isAdmin(session: RoleLikeSession | null): boolean {
  return session?.isAdmin ?? false;
}

// Add more helpers as needed for facility admin, etc.
