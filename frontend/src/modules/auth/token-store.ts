// ─────────────────────────────────────────────────────────────────────────────
// Tiny localStorage-backed token store.
//
// Lives in its own module so apiClient (a non-React utility) can read the
// token without depending on the AuthProvider context. The provider is the
// only writer; everywhere else just reads via getAuthToken().
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "festify.auth.token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      window.localStorage.setItem(STORAGE_KEY, token);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore — quota / private mode
  }
}
