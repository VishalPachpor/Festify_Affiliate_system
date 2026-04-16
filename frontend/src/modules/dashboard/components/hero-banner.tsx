"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useAuth } from "@/modules/auth";

// Figma 53:1730 — exact multi-stop gradient
const HERO_GRADIENT =
  "linear-gradient(172deg, rgb(19,32,84) 0%, rgb(21,38,95) 7%, rgb(22,43,106) 14%, rgb(24,49,118) 21%, rgb(25,55,130) 29%, rgb(26,61,142) 36%, rgb(27,68,154) 43%, rgb(28,74,166) 50%, rgb(28,67,148) 57%, rgb(28,61,131) 64%, rgb(28,55,114) 71%, rgb(27,48,97) 79%, rgb(26,42,81) 86%, rgb(25,35,65) 93%, rgb(23,29,50) 100%)";

export function HeroBanner() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const firstName = user?.fullName?.split(/\s+/)[0] ?? "there";
  const eventName = tenant?.name?.startsWith("TOKEN2049")
    ? (tenant.name.includes("2026") ? tenant.name : `${tenant.name} 2026`).replace(/\s+/g, " ").trim()
    : tenant?.name ?? "TOKEN2049 Singapore 2026";

  return (
    <section
      className="relative flex min-h-[166px] flex-col justify-center overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.1)] px-[48px] pt-[48px] pb-[40px]"
      style={{ backgroundImage: HERO_GRADIENT }}
      aria-label="Welcome banner"
    >
      {/* Subtle radial glow overlay — Figma 53:1734 */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-10"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(201,168,76,0.3), transparent 70%)",
        }}
      />
      {/* Heading — Figma: Oswald Bold 32px, tracking -0.48px */}
      <h1 className="relative font-[var(--font-display)] text-[32px] font-bold leading-[32px] tracking-[-0.48px] text-[#F0F0F0]">
        Welcome Back, {firstName}!
      </h1>
      {/* Subtitle — Figma: 18px Regular, leading 28px */}
      <p
        aria-live="polite"
        className="relative mt-[8px] max-w-[46rem] font-[var(--font-sans)] text-[18px] leading-[28px] text-[#F0F0F0]"
      >
        Track your performance and grow your earnings with {eventName}
      </p>
    </section>
  );
}
