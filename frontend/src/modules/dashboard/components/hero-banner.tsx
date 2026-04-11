"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useAuth } from "@/modules/auth";

export function HeroBanner() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const firstName = user?.fullName?.split(/\s+/)[0] ?? "there";
  const eventName = tenant?.name?.startsWith("TOKEN2049")
    ? (tenant.name.includes("2026") ? tenant.name : `${tenant.name} 2026`).replace(/\s+/g, " ").trim()
    : tenant?.name ?? "TOKEN2049 Singapore 2026";

  return (
    <section
      className="bg-hero-gradient relative flex min-h-[6.5rem] flex-col justify-center overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-ghost)] px-[var(--space-8)] py-[var(--space-5)]"
      aria-label="Welcome banner"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-[32%] opacity-25"
        style={{
          background:
            "radial-gradient(circle at 40% 40%, rgba(255,255,255,0.18), transparent 68%)",
        }}
      />
      <h1 className="font-[var(--font-display)] text-[var(--text-2xl)] font-bold leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">
        Welcome Back, {firstName}!
      </h1>
      <p
        aria-live="polite"
        className="mt-[var(--space-1)] max-w-[46rem] font-[var(--font-sans)] text-[var(--text-lg)] leading-[1.35] text-[rgba(255,255,255,0.9)]"
      >
        Track your performance and grow your earnings with {eventName}
      </p>
    </section>
  );
}
