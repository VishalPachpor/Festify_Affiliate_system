"use client";

import { useState } from "react";
import { useCurrentAffiliate } from "@/modules/affiliates/hooks/use-current-affiliate";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/text-input";

function IconCopy() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="3" width="7" height="9" rx="1.5" />
      <path d="M3 10V5a2 2 0 012-2h5" />
    </svg>
  );
}

export function ReferralCard() {
  const { data: affiliate, isLoading, error } = useCurrentAffiliate();
  const [copied, setCopied] = useState(false);

  const referralUrl = affiliate?.referralUrl ?? "";
  const referralCode = affiliate?.referralCode ?? "";

  function handleCopy() {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const input = document.querySelector<HTMLInputElement>('[aria-label="Referral URL"]');
      input?.select();
    });
  }

  return (
    <section
      aria-label="Referral link"
      className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]"
    >
      <h2 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">
        Your Referral Link
      </h2>

      <div className="mt-[0.9rem] flex items-center gap-[0.75rem]">
        <TextInput
          readOnly
          value={isLoading ? "Loading…" : referralUrl}
          aria-label="Referral URL"
          className="h-[2.2rem] flex-1 cursor-text select-all text-[0.92rem] text-[var(--color-text-secondary)] hover:border-[var(--color-border)] focus-visible:ring-0 focus-visible:border-[var(--color-border)]"
        />
        <Button
          variant="primary"
          onClick={handleCopy}
          disabled={!referralUrl}
          aria-label={copied ? "Link copied to clipboard" : "Copy referral link"}
          aria-live="polite"
          className="h-[2.2rem] shrink-0 gap-[0.5rem] px-[1rem] text-[0.92rem]"
        >
          <IconCopy />
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>

      <div className="mt-[0.6rem] flex flex-col gap-[0.2rem]">
        <p className="font-[var(--font-sans)] text-[0.82rem] leading-[1.1rem] text-[var(--color-text-secondary)]">
          Share your unique link to earn commissions
        </p>
        {error ? (
          <p className="font-[var(--font-sans)] text-[0.82rem] leading-[1.1rem] text-[#FCA5A5]">
            Could not load referral code: {error instanceof Error ? error.message : "unknown error"}
          </p>
        ) : (
          <p className="font-[var(--font-sans)] text-[0.82rem] leading-[1.1rem] text-[var(--color-text-secondary)]">
            Referral Code:{" "}
            <span className="font-medium text-[0.82rem] text-[var(--color-success)]">
              {referralCode || "—"}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
