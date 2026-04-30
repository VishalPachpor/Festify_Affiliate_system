"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/modules/auth";

// ─────────────────────────────────────────────────────────────────────────────
// UserMenu
//
// Avatar button + dropdown. Two modes:
//
//   1. Authenticated → user info + Log out
//   2. Unauthenticated → "Sign in" / "Sign up" links so the user can reach
//      the auth pages from anywhere in the app (and so the avatar always
//      stays visible — no surprise empty corner of the header).
//
// Loading state shows a pulsing placeholder so the header doesn't reflow
// while AuthProvider hydrates from localStorage.
// ─────────────────────────────────────────────────────────────────────────────

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function IconUser() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="6" r="2.6" />
      <path d="M2.5 14c0-2.6 2.4-4.5 5.5-4.5s5.5 1.9 5.5 4.5" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 12l3-4-3-4" />
      <path d="M13 8H6" />
      <path d="M9 2H3a1 1 0 00-1 1v10a1 1 0 001 1h6" />
    </svg>
  );
}

function IconLogin() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 4l-3 4 3 4" />
      <path d="M3 8h7" />
      <path d="M7 14h6a1 1 0 001-1V3a1 1 0 00-1-1H7" />
    </svg>
  );
}

export function UserMenu() {
  const { user, status, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Outside-click closes the dropdown.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Loading: render a neutral placeholder so the header doesn't reflow
  // while AuthProvider hydrates from localStorage on first paint.
  if (status === "loading") {
    return (
      <div
        aria-hidden="true"
        className="flex size-[var(--space-8)] animate-pulse items-center justify-center rounded-full bg-[rgba(255,255,255,0.06)]"
      />
    );
  }

  const isAuthenticated = status === "authenticated" && !!user;
  const initials = isAuthenticated ? initialsFor(user.fullName || user.email) : null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={isAuthenticated ? `Account menu for ${user.fullName || user.email}` : "Account menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-[var(--space-8)] items-center justify-center rounded-full bg-[var(--color-avatar-bg)] transition-opacity hover:opacity-90"
      >
        {isAuthenticated ? (
          <span className="font-[var(--font-sans)] text-[var(--text-xs)] font-semibold text-[var(--color-primary-foreground)]">
            {initials}
          </span>
        ) : (
          <span className="text-[var(--color-primary-foreground)]">
            <IconUser />
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-[calc(100%+var(--space-2))] z-50 w-[16rem] overflow-hidden rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[#0E0F11] shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        >
          {isAuthenticated ? (
            <>
              <div className="border-b border-[rgba(255,255,255,0.08)] px-[var(--space-4)] py-[var(--space-3)]">
                <p className="font-[var(--font-sans)] text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
                  {user.fullName || "Marketing Partner"}
                </p>
                <p className="mt-[var(--space-1)] truncate font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.55)]">
                  {user.email}
                </p>
                <p className="mt-[var(--space-1)] inline-block rounded-[var(--radius-sm)] bg-[rgba(255,255,255,0.06)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.06em] text-[rgba(255,255,255,0.55)]">
                  {user.role}
                </p>
              </div>

              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="flex w-full items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-3)] text-left font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              >
                <IconLogout />
                Log out
              </button>
            </>
          ) : (
            <>
              <div className="border-b border-[rgba(255,255,255,0.08)] px-[var(--space-4)] py-[var(--space-3)]">
                <p className="font-[var(--font-sans)] text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
                  Not signed in
                </p>
                <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.55)]">
                  Sign in to access your account.
                </p>
              </div>

              <Link
                href="/sign-in"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-[var(--space-2)] px-[var(--space-4)] py-[var(--space-3)] text-left font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.04)]"
              >
                <IconLogin />
                Sign in
              </Link>

              <Link
                href="/sign-up"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex w-full items-center gap-[var(--space-2)] border-t border-[rgba(255,255,255,0.06)] px-[var(--space-4)] py-[var(--space-3)] text-left font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.75)] transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--color-text-primary)]"
              >
                <IconUser />
                Create an account
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
