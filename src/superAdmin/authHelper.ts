/**
 * Isolated authentication helper for Traviska Super Admin (CEO) portal.
 * Super Admin uses independent storage keys (`superAdminToken` and `superAdminUser`)
 * so that logging into or testing Staff/Admin accounts never overwrites or invalidates
 * the active Super Admin session.
 */

export const SUPER_ADMIN_TOKEN_KEY = "superAdminToken";
export const SUPER_ADMIN_USER_KEY = "superAdminUser";

export function getSuperAdminToken(): string | null {
  return localStorage.getItem(SUPER_ADMIN_TOKEN_KEY) || localStorage.getItem("token");
}

export function getSuperAdminUser(): any | null {
  const raw = localStorage.getItem(SUPER_ADMIN_USER_KEY) || localStorage.getItem("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setSuperAdminAuth(token: string, user: any) {
  localStorage.setItem(SUPER_ADMIN_TOKEN_KEY, token);
  localStorage.setItem(SUPER_ADMIN_USER_KEY, JSON.stringify(user));
  // Keep general token in sync only if general token isn't held by an active admin
  try {
    const existing = localStorage.getItem("user");
    if (!existing || JSON.parse(existing)?.role === "super_admin") {
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("isAdmin", "true");
    }
  } catch {
    localStorage.setItem("token", token);
  }
}

export function clearSuperAdminAuth() {
  localStorage.removeItem(SUPER_ADMIN_TOKEN_KEY);
  localStorage.removeItem(SUPER_ADMIN_USER_KEY);
  try {
    const rawUser = localStorage.getItem("user");
    if (rawUser && JSON.parse(rawUser)?.role === "super_admin") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("isAdmin");
    }
  } catch {
    // ignore
  }
}

