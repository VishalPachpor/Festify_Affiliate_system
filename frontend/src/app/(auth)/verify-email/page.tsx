"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { VerifyEmailForm } from "@/modules/auth/components/verify-email-form";

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.5 3.5 6 8l4.5 4.5" />
      <path d="M6 8h6" />
    </svg>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  return (
    <div className="mx-auto w-[min(35rem,92vw)] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-input)] px-[var(--space-8)] py-[var(--space-8)] shadow-[var(--shadow-card)]">
      <Link
        href="/sign-in"
        className="inline-flex items-center gap-[var(--space-2)] font-[var(--font-sans)] text-[1.1rem] text-[var(--color-text-link)] transition-colors hover:text-[var(--color-text-link-hover)]"
      >
        <ArrowLeftIcon />
        Back to Login
      </Link>

      <div className="mt-[var(--space-8)] flex flex-col items-center text-center">
        <Image
          src="/token.png"
          alt="TOKEN2049"
          width={220}
          height={28}
          className="h-[2rem] w-auto"
          priority
        />
        <h2 className="mt-[var(--space-8)] font-[var(--font-display)] text-[3rem] font-bold leading-[1.08] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
          Verify Your Email
        </h2>
        <p className="mt-[var(--space-3)] max-w-[24rem] font-[var(--font-sans)] text-[1.05rem] leading-[1.55] text-[var(--color-text-secondary)]">
          {email
            ? `Enter the 6-digit code sent to ${email}`
            : "Enter the 6-digit code sent to your email"}
        </p>
      </div>

      <div className="mt-[var(--space-8)]">
        <VerifyEmailForm email={email} />
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
