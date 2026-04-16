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
      className="rounded-[8px] border border-[rgba(255,255,255,0.1)] p-[24px]"
      style={{ background: "rgba(21,26,43,0.5)" }}
    >
      {/* Heading — Figma 56:2735: Oswald Medium 18px, tracking -0.2px */}
      <h2 className="font-[var(--font-display)] text-[18px] font-medium leading-[20px] tracking-[-0.2px] text-[#F0F0F0]">
        Your Referral Link
      </h2>

      <div className="mt-[var(--space-4)] flex items-center gap-[var(--space-3)]">
        <TextInput
          readOnly
          value={isLoading ? "Loading…" : referralUrl}
          aria-label="Referral URL"
          className="h-[var(--space-8)] flex-1 cursor-text select-all text-[var(--text-sm)] text-[var(--color-text-secondary)] hover:border-[var(--color-border)] focus-visible:ring-0 focus-visible:border-[var(--color-border)]"
        />
        <Button
          variant="primary"
          onClick={handleCopy}
          disabled={!referralUrl}
          aria-label={copied ? "Link copied to clipboard" : "Copy referral link"}
          aria-live="polite"
          className="h-[var(--space-8)] shrink-0 gap-[var(--space-2)] px-[var(--space-4)] text-[var(--text-sm)]"
        >
          <IconCopy />
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>

      {/* Helper text — Figma: 12px #E5E5E5, referral code in #22C55E */}
      <div className="mt-[8px] flex flex-col gap-[4px]">
        <p className="font-[var(--font-sans)] text-[12px] leading-[18px] text-[#E5E5E5]">
          Share your unique link to earn commissions
        </p>
        {error ? (
          <p className="font-[var(--font-sans)] text-[12px] leading-[18px] text-[#FCA5A5]">
            Could not load referral code: {error instanceof Error ? error.message : "unknown error"}
          </p>
        ) : (
          <p className="font-[var(--font-sans)] text-[12px] leading-[18px] text-white">
            Referral Code:{" "}
            <span className="text-[#22C55E]">
              {referralCode || "—"}
            </span>
          </p>
        )}
      </div>
    </section>
  );
}
