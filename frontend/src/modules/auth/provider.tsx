"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, setAuthToken } from "./token-store";
import { login as loginRequest } from "./api/login";
import { signup as signupRequest } from "./api/signup";
import { verifyEmail as verifyEmailRequest } from "./api/verify-email";
import { resendCode as resendCodeRequest } from "./api/resend-code";
import { loginWithGoogle as googleRequest } from "./api/google";
import { getMe } from "./api/me";
import type { User } from "./types";
import type { LoginFormValues, SignUpFormValues } from "./schemas";

// ─────────────────────────────────────────────────────────────────────────────
// AuthProvider
//
// Owns the JWT + user state for the entire app. Mounted at the root layout so
// every page (admin, dashboard, public /apply) can read auth status.
//
// Storage strategy: JWT in localStorage. The token store is read by both
// this provider AND the apiClient (which auto-attaches the Authorization
// header). On mount, hydrates from localStorage by calling /api/auth/me — if
// the token is rejected, the store is cleared and the user is logged out.
// ─────────────────────────────────────────────────────────────────────────────

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  // Actions
  login: (data: LoginFormValues) => Promise<User>;
  signup: (data: SignUpFormValues) => Promise<{ email: string }>;
  verifyEmail: (email: string, code: string) => Promise<User>;
  resendCode: (email: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<User>;
  /** Store a pre-verified JWT + user from the OAuth callback popup. */
  loginDirect: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const router = useRouter();

  // Bootstrap: if there's a token in localStorage, validate it via /me.
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      setStatus("unauthenticated");
      return;
    }
    let cancelled = false;
    getMe()
      .then(({ user }) => {
        if (cancelled) return;
        setUser(user);
        setStatus("authenticated");
      })
      .catch(() => {
        if (cancelled) return;
        // Token rejected — wipe and treat as logged out.
        setAuthToken(null);
        setUser(null);
        setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Actions ────────────────────────────────────────────────────────────

  const login = useCallback(async (data: LoginFormValues): Promise<User> => {
    const { token, user: u } = await loginRequest(data);
    setAuthToken(token);
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const signup = useCallback(async (data: SignUpFormValues) => {
    const res = await signupRequest(data);
    return { email: res.email };
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string): Promise<User> => {
    const { token, user: u } = await verifyEmailRequest(email, code);
    setAuthToken(token);
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const resendCode = useCallback(async (email: string) => {
    await resendCodeRequest(email);
  }, []);

  const loginWithGoogle = useCallback(async (credential: string): Promise<User> => {
    const { token, user: u } = await googleRequest(credential);
    setAuthToken(token);
    setUser(u);
    setStatus("authenticated");
    return u;
  }, []);

  const loginDirect = useCallback((token: string, u: User) => {
    setAuthToken(token);
    setUser(u);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
    setStatus("unauthenticated");
    router.push("/sign-in");
  }, [router]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login,
      signup,
      verifyEmail,
      resendCode,
      loginWithGoogle,
      loginDirect,
      logout,
    }),
    [status, user, login, signup, verifyEmail, resendCode, loginWithGoogle, loginDirect, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Helper for picking the post-login destination based on the user's role.
 * Admins land on /admin, affiliates on /dashboard.
 */
export function destinationForRole(role: User["role"]): string {
  return role === "admin" ? "/admin" : "/dashboard";
}
