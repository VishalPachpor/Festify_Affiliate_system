"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SocialButton } from "@/components/ui/social-button";
import { useAuth, destinationForRole } from "../provider";
import { getApiBaseUrl } from "@/services/api/client";

// ─────────────────────────────────────────────────────────────────────────────
// GoogleSignInButton — redirect-based OAuth2 flow
//
// Avoids Google Identity Services (GSI) entirely. GSI's client-side origin
// check is unreliable on localhost — it rejects valid origins even after
// they're registered in the Google Console.
//
// Instead we use the standard OAuth2 authorization code flow:
//
//   1. Frontend opens a popup to → backend /api/auth/google/redirect
//   2. Backend 302s to Google consent page with redirect_uri
//   3. Google redirects back to → backend /api/auth/google/callback?code=…
//   4. Backend exchanges code for user info, creates/finds User, issues JWT
//   5. Backend returns an HTML page that postMessages {token, user} to the
//      opener window and closes itself
//   6. Frontend receives the message, stores the JWT, redirects
//
// This flow only checks the *redirect URI* (backend-side), not the
// JavaScript origin (frontend-side), so it works reliably on any port.
// ─────────────────────────────────────────────────────────────────────────────

export function isGoogleEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
}

type GoogleSignInMode = "login" | "affiliate_signup";

export function GoogleSignInButton({ mode = "login" }: { mode?: GoogleSignInMode }) {
  const router = useRouter();
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const popupRef = useRef<Window | null>(null);

  // Listen for the postMessage from the OAuth callback popup.
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const backendOrigin = new URL(getApiBaseUrl()).origin;
      if (event.origin !== backendOrigin) return;

      const data = event.data;
      if (!data || typeof data !== "object" || data.type !== "google-auth-callback") return;

      popupRef.current?.close();
      popupRef.current = null;

      if (data.error) {
        setError(String(data.error));
        setLoading(false);
        return;
      }

      if (data.token && data.user) {
        // Store JWT and user via the auth provider. loginWithGoogleDirect
        // accepts pre-verified token+user (no backend call needed — the
        // backend already verified the Google token in the callback).
        auth.loginDirect(data.token, data.user);
        router.push(destinationForRole(data.user.role));
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [auth, router]);

  const handleClick = useCallback(() => {
    setError(null);

    if (!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) {
      setError("Google sign-in is not configured yet. Use email and password to log in.");
      return;
    }

    setLoading(true);

    const w = 500;
    const h = 600;
    const left = window.screenX + (window.innerWidth - w) / 2;
    const top = window.screenY + (window.innerHeight - h) / 2;

    const popup = window.open(
      `${getApiBaseUrl()}/auth/google/redirect?intent=${encodeURIComponent(mode)}`,
      "google-auth",
      `width=${w},height=${h},left=${left},top=${top},popup=true`,
    );

    if (!popup) {
      setError("Popup was blocked. Please allow popups for this site.");
      setLoading(false);
      return;
    }

    popupRef.current = popup;

    // Watch for the popup being closed manually (user cancelled).
    // The popup navigates cross-origin (Google), so accessing popup.closed
    // may throw due to Cross-Origin-Opener-Policy. Silently catch — if the
    // popup is truly closed, the postMessage handler won't fire and the
    // loading state resets; if the user clicks again, it resets too.
    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          setLoading(false);
          popupRef.current = null;
        }
      } catch {
        // COOP blocks access — stop polling; postMessage handles success.
        clearInterval(timer);
      }
    }, 500);
  }, [mode]);

  return (
    <div className="flex w-full flex-col gap-[var(--space-2)]">
      <SocialButton
        provider="google"
        onClick={handleClick}
        disabled={loading}
      />
      {error && (
        <p
          role="alert"
          className="text-center font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-error)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
