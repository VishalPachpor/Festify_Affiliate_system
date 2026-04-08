import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Reset Password — Festify Affiliates",
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex w-[min(var(--card-w),90vw)] flex-col items-center gap-[var(--space-4)]">
      <div className="w-full rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--card-pad-x)] py-[var(--card-pad-y)] shadow-[var(--shadow-card)]">
        <h2 className="font-[var(--font-display)] font-bold text-[var(--text-2xl)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
          Reset Password
        </h2>
        <p className="mt-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          This feature is coming soon.
        </p>
        <Link
          href="/sign-in"
          className="mt-[var(--space-4)] inline-block font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-link)] underline transition-colors hover:text-[var(--color-text-link-hover)]"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
