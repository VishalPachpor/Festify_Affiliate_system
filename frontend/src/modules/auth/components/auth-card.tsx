"use client";

import Image from "next/image";
import Link from "next/link";
import { Divider } from "@/components/ui/divider";
import { Tabs } from "@/components/ui/tabs";
import { GoogleSignInButton } from "./google-sign-in";

const authTabs = [
  { label: "Login", href: "/sign-in" },
  { label: "Sign Up", href: "/sign-up" },
] as const;

export function AuthCard({
  title,
  subtitle,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
  showGoogle = true,
  googleMode = "login",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
  showGoogle?: boolean;
  googleMode?: "login" | "affiliate_signup";
}) {
  return (
    <div className="mx-auto flex w-[min(var(--card-w),90vw)] flex-col items-center gap-[1rem]">
      {/* Logo */}
      <div className="shrink-0 flex flex-col items-center gap-[0.6rem]">
        <Image
          src="/token.png"
          alt="TOKEN2049"
          width={187}
          height={24}
          className="h-[1.5rem] w-auto"
          priority
        />
        <p className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-label)] text-[var(--color-text-white)] text-center">
          Singapore 2026
        </p>
      </div>

      {/* Tabs */}
      <div className="shrink-0 w-full">
        <Tabs items={authTabs} />
      </div>

      {/* Card */}
      <div className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--card-pad-x)] py-[var(--card-pad-y)] shadow-[var(--shadow-card)]">
        {/* Header */}
        <div className="shrink-0 flex flex-col gap-[var(--space-2)]">
          <h2 className="font-[var(--font-display)] font-bold text-[var(--text-2xl)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
            {title}
          </h2>
          {subtitle && (
            <p className="font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.45] text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          )}
          <p className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] tracking-[var(--tracking-caption)] uppercase text-[var(--color-text-secondary)]">
            Required fields marked with *
          </p>
        </div>

        {/* Google + Divider + Form */}
        <div className="mt-[var(--card-gap)] flex flex-col gap-[var(--space-4)]">
          {showGoogle && (
            <div className="shrink-0 flex flex-col gap-[var(--space-5)]">
              <GoogleSignInButton mode={googleMode} />
              <Divider label="Or continue with email" />
            </div>
          )}

          {/* Form */}
          {children}
        </div>

        {/* Footer */}
        <div className="mt-[var(--card-gap)] shrink-0 text-center">
          <Link
            href={footerLinkHref}
            className="font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--leading-snug)] text-[var(--color-text-link)] underline transition-colors hover:text-[var(--color-text-link-hover)]"
          >
            {footerText} {footerLinkText}
          </Link>
        </div>
      </div>
    </div>
  );
}
