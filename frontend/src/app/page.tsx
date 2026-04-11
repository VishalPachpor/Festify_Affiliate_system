"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, destinationForRole } from "@/modules/auth";

// ─────────────────────────────────────────────────────────────────────────────
// Landing page
//
// If the user is already logged in → redirect to their dashboard immediately.
// Otherwise → show the entry point with clear Log In / Sign Up CTAs and a
// brief explanation of the two roles.
// ─────────────────────────────────────────────────────────────────────────────

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l7 4v5c0 5.25-3.5 8.25-7 10-3.5-1.75-7-4.75-7-10V6l7-4z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}

function IconUsers() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="3" />
      <path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2" />
      <circle cx="17" cy="8" r="2" />
      <path d="M21 21v-1.5a3 3 0 00-2-2.83" />
    </svg>
  );
}

function IconChart() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

export default function HomePage() {
  const { status, user } = useAuth();
  const router = useRouter();

  // Already logged in → skip the landing, go straight to the right dashboard.
  useEffect(() => {
    if (status === "authenticated" && user) {
      router.replace(destinationForRole(user.role));
    }
  }, [status, user, router]);

  // While auth is loading or redirect is in flight, show nothing.
  if (status === "loading" || (status === "authenticated" && user)) {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-[var(--space-6)] py-[var(--space-10)]">
      {/* Hero */}
      <div className="mx-auto max-w-[44rem] text-center">
        <p className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.12em] text-[var(--color-primary)]">
          Revenue Automation for Events
        </p>
        <h1 className="mt-[var(--space-3)] font-[var(--font-display)] text-[var(--text-2xl)] font-bold leading-[1.05] tracking-[-0.04em] text-[var(--color-text-primary)]">
          Festify Affiliates
        </h1>
        <p className="mt-[var(--space-4)] mx-auto max-w-[32rem] font-[var(--font-sans)] text-[var(--text-lg)] leading-[1.6] text-[var(--color-text-secondary)]">
          Recruit affiliates, equip them with materials, track every sale, and reward commissions — all in one platform.
        </p>

        {/* CTAs */}
        <div className="mt-[var(--space-8)] flex flex-col items-center gap-[var(--space-3)] sm:flex-row sm:justify-center">
          <Link
            href="/signup/organizer"
            className="flex items-center gap-[var(--space-2)] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-6)] py-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            Start as Organizer
            <IconArrowRight />
          </Link>
          <Link
            href="/sign-up"
            className="flex items-center gap-[var(--space-2)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.18)] px-[var(--space-6)] py-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.32)] hover:bg-[rgba(255,255,255,0.04)]"
          >
            Apply as Affiliate
          </Link>
        </div>
        <p className="mt-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          Already have an account?{" "}
          <Link href="/sign-in" className="text-[var(--color-text-link)] underline hover:text-[var(--color-text-link-hover)]">
            Log in
          </Link>
        </p>
      </div>

      {/* Role cards */}
      <div className="mx-auto mt-[var(--space-10)] grid max-w-[52rem] gap-[var(--space-5)] sm:grid-cols-2">
        {/* Organizer card */}
        <div className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] px-[var(--space-6)] py-[var(--space-6)]">
          <div className="flex items-center gap-[var(--space-3)] text-[var(--color-primary)]">
            <IconShield />
            <h2 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
              Event Organizers
            </h2>
          </div>
          <ul className="mt-[var(--space-4)] flex flex-col gap-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
            <li>Connect your ticketing platform (Luma)</li>
            <li>Review and approve affiliate applications</li>
            <li>Upload promotional materials</li>
            <li>Track revenue, attribution, and commissions</li>
            <li>Pay affiliates from the admin dashboard</li>
          </ul>
          <Link
            href="/signup/organizer"
            className="mt-[var(--space-5)] inline-flex items-center gap-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary)] transition-colors hover:underline"
          >
            Start as Organizer
            <IconArrowRight />
          </Link>
        </div>

        {/* Affiliate card */}
        <div className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] px-[var(--space-6)] py-[var(--space-6)]">
          <div className="flex items-center gap-[var(--space-3)] text-[#22C55E]">
            <IconUsers />
            <h2 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
              Affiliates
            </h2>
          </div>
          <ul className="mt-[var(--space-4)] flex flex-col gap-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
            <li>Apply to promote events you believe in</li>
            <li>Get your unique referral link and code</li>
            <li>Access banners, copy, and email templates</li>
            <li>Earn commission on every ticket sale</li>
            <li>Track your earnings and milestones live</li>
          </ul>
          <Link
            href="/sign-up"
            className="mt-[var(--space-5)] inline-flex items-center gap-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[#22C55E] transition-colors hover:underline"
          >
            Apply as Affiliate
            <IconArrowRight />
          </Link>
        </div>
      </div>

      {/* How it works */}
      <div className="mx-auto mt-[var(--space-10)] max-w-[44rem] text-center">
        <div className="flex items-center justify-center gap-[var(--space-3)] text-[var(--color-text-secondary)]">
          <IconChart />
          <h2 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]">
            How It Works
          </h2>
        </div>
        <div className="mt-[var(--space-5)] grid grid-cols-5 gap-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)]">
          {["Recruit", "Equip", "Track", "Reward", "Repeat"].map((step, i) => (
            <div key={step} className="flex flex-col items-center gap-[var(--space-2)]">
              <span className="flex size-[2rem] items-center justify-center rounded-full bg-[rgba(91,141,239,0.15)] font-[var(--font-sans)] text-[var(--text-xs)] font-semibold text-[var(--color-primary)]">
                {i + 1}
              </span>
              <span className="text-[var(--color-text-primary)]">{step}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="mx-auto mt-[var(--space-10)] text-center font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.35)]">
        Festify Affiliates — Revenue automation for events
      </footer>
    </main>
  );
}
