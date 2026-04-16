"use client";

import { useState } from "react";
import type { Affiliate } from "@/modules/affiliates/types";

// ── Tier colors ──────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  platinum: "#E5E4E2",
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",
};

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  platinum: { bg: "rgba(229,228,226,0.12)", text: "#E5E4E2", border: "rgba(229,228,226,0.25)" },
  gold:     { bg: "rgba(255,215,0,0.12)",   text: "#FFD700", border: "rgba(255,215,0,0.25)"   },
  silver:   { bg: "rgba(192,192,192,0.12)", text: "#C0C0C0", border: "rgba(192,192,192,0.25)" },
  bronze:   { bg: "rgba(205,127,50,0.12)",  text: "#CD7F32", border: "rgba(205,127,50,0.25)"  },
};

// ── Formatter ────────────────────────────────────────────────────────────────

function formatCurrency(minorUnits: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
  affiliate: Affiliate | null;
  onClose: () => void;
  currency?: string;
};

// ── Component ────────────────────────────────────────────────────────────────

export function AffiliateDetailDrawer({ affiliate, onClose, currency }: Props) {
  const [codeCopied, setCodeCopied] = useState(false);

  if (!affiliate) return null;

  const initials = affiliate.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const tierColor = TIER_COLORS[affiliate.tier ?? ""] ?? "#5B8DEF";
  const tierStyle = TIER_STYLES[affiliate.tier ?? ""];
  const cur = currency ?? affiliate.currency ?? "USD";

  const statusDisplay =
    affiliate.status === "approved" ? "active" : affiliate.status;

  const handleCopyCode = () => {
    if (!affiliate.referralCode) return;
    navigator.clipboard.writeText(affiliate.referralCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[32rem] flex-col border-l bg-[#111525] transition-transform duration-300 ease-out"
        style={{ borderLeftColor: "rgba(255,255,255,0.08)" }}
        role="dialog"
        aria-modal="true"
        aria-label="Affiliate details"
      >
        {/* ── Scrollable content ────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {/* Header area */}
          <div className="px-[32px] pt-[28px]">
            {/* Close button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center rounded-[6px] p-[6px] text-[rgba(255,255,255,0.40)] transition-colors hover:bg-[rgba(255,255,255,0.06)] hover:text-[rgba(255,255,255,0.80)]"
                aria-label="Close drawer"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            {/* Avatar + name block */}
            <div className="mt-[16px] flex flex-col items-center text-center">
              {/* Avatar circle */}
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 64,
                  height: 64,
                  background: tierColor,
                }}
              >
                <span
                  className="font-[var(--font-sans)] font-semibold text-white"
                  style={{ fontSize: 22 }}
                >
                  {initials}
                </span>
              </div>

              {/* Name */}
              <h2
                className="mt-[14px] font-[var(--font-display)] font-bold leading-none tracking-[-0.03em] text-[#F0F0F0]"
                style={{ fontSize: 24 }}
              >
                {affiliate.name}
              </h2>

              {/* Email */}
              <p
                className="mt-[6px] font-[var(--font-sans)]"
                style={{ fontSize: 14, color: "#9CA4B7" }}
              >
                {affiliate.email}
              </p>

              {/* Referral code + copy */}
              {affiliate.referralCode && (
                <div className="mt-[14px] flex items-center gap-[8px]">
                  <span
                    className="rounded-[4px] px-[10px] py-[4px] font-mono font-medium"
                    style={{
                      fontSize: 13,
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.55)",
                    }}
                  >
                    {affiliate.referralCode}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="rounded-[4px] border px-[8px] py-[3px] font-[var(--font-sans)] transition-colors"
                    style={{
                      fontSize: 11,
                      borderColor: codeCopied
                        ? "rgba(34,197,94,0.40)"
                        : "rgba(255,255,255,0.12)",
                      color: codeCopied ? "#22C55E" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    {codeCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}

              {/* Tier + Status badges */}
              <div className="mt-[14px] flex items-center gap-[8px]">
                {tierStyle ? (
                  <span
                    className="inline-block rounded-[4px] border px-[10px] py-[4px] font-[var(--font-sans)] font-medium capitalize"
                    style={{
                      fontSize: 12,
                      background: tierStyle.bg,
                      color: tierStyle.text,
                      borderColor: tierStyle.border,
                    }}
                  >
                    {affiliate.tier}
                  </span>
                ) : (
                  <span
                    className="inline-block rounded-[4px] border px-[10px] py-[4px] font-[var(--font-sans)] font-medium"
                    style={{
                      fontSize: 12,
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.35)",
                      borderColor: "rgba(255,255,255,0.08)",
                    }}
                  >
                    No tier
                  </span>
                )}
                <span
                  className="inline-block rounded-[4px] px-[10px] py-[4px] font-[var(--font-sans)] font-medium capitalize"
                  style={{
                    fontSize: 12,
                    ...(statusDisplay === "active"
                      ? { background: "rgba(34,197,94,0.10)", color: "rgba(34,197,94,0.75)" }
                      : statusDisplay === "pending"
                        ? { background: "rgba(234,179,8,0.14)", color: "#EAB308" }
                        : { background: "rgba(239,68,68,0.14)", color: "#EF4444" }),
                  }}
                >
                  {statusDisplay}
                </span>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div
            className="mx-[32px] mt-[28px]"
            style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
          />

          {/* ── KPI Grid (2x2) ──────────────────────────────────── */}
          <div className="mx-[32px] mt-[24px] grid grid-cols-2 gap-[12px]">
            {/* Total Revenue */}
            <div
              className="rounded-[8px] border px-[16px] py-[14px]"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="font-[var(--font-sans)] font-medium uppercase tracking-[0.08em]"
                style={{ fontSize: 12, color: "#9CA4B7" }}
              >
                Total Revenue
              </p>
              <p
                className="mt-[6px] font-[var(--font-sans)] font-bold text-[#F0F0F0]"
                style={{ fontSize: 20 }}
              >
                {formatCurrency(affiliate.totalRevenue, cur)}
              </p>
            </div>

            {/* Total Commission */}
            <div
              className="rounded-[8px] border px-[16px] py-[14px]"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="font-[var(--font-sans)] font-medium uppercase tracking-[0.08em]"
                style={{ fontSize: 12, color: "#9CA4B7" }}
              >
                Total Commission
              </p>
              <p
                className="mt-[6px] font-[var(--font-sans)] font-bold"
                style={{ fontSize: 20, color: "#C9A84C" }}
              >
                {formatCurrency(affiliate.totalCommission, cur)}
              </p>
            </div>

            {/* Total Sales */}
            <div
              className="rounded-[8px] border px-[16px] py-[14px]"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="font-[var(--font-sans)] font-medium uppercase tracking-[0.08em]"
                style={{ fontSize: 12, color: "#9CA4B7" }}
              >
                Total Sales
              </p>
              <p
                className="mt-[6px] font-[var(--font-sans)] font-bold text-[#F0F0F0]"
                style={{ fontSize: 20 }}
              >
                {affiliate.totalSales}
              </p>
            </div>

            {/* Tier */}
            <div
              className="rounded-[8px] border px-[16px] py-[14px]"
              style={{
                background: "rgba(255,255,255,0.02)",
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <p
                className="font-[var(--font-sans)] font-medium uppercase tracking-[0.08em]"
                style={{ fontSize: 12, color: "#9CA4B7" }}
              >
                Tier
              </p>
              <div className="mt-[6px]">
                {tierStyle ? (
                  <span
                    className="inline-block rounded-[4px] border px-[10px] py-[3px] font-[var(--font-sans)] font-semibold capitalize"
                    style={{
                      fontSize: 14,
                      background: tierStyle.bg,
                      color: tierStyle.text,
                      borderColor: tierStyle.border,
                    }}
                  >
                    {affiliate.tier}
                  </span>
                ) : (
                  <span
                    className="font-[var(--font-sans)] font-bold text-[rgba(255,255,255,0.35)]"
                    style={{ fontSize: 20 }}
                  >
                    --
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div
            className="mx-[32px] mt-[24px]"
            style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
          />

          {/* ── Sales History ───────────────────────────────────── */}
          <div className="mx-[32px] mt-[24px] pb-[24px]">
            <div className="flex items-center justify-between">
              <h3
                className="font-[var(--font-display)] font-bold tracking-[-0.02em] text-[#F0F0F0]"
                style={{ fontSize: 16 }}
              >
                Recent Sales
              </h3>
              <span
                className="font-[var(--font-sans)] font-medium"
                style={{ fontSize: 13, color: "#9CA4B7" }}
              >
                {affiliate.totalSales} total
              </span>
            </div>

            {affiliate.totalSales === 0 ? (
              <div
                className="mt-[16px] flex items-center justify-center rounded-[8px] border py-[32px]"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <p
                  className="font-[var(--font-sans)]"
                  style={{ fontSize: 14, color: "rgba(255,255,255,0.35)" }}
                >
                  No sales yet
                </p>
              </div>
            ) : (
              <div
                className="mt-[16px] rounded-[8px] border px-[16px] py-[14px]"
                style={{
                  background: "rgba(255,255,255,0.02)",
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p
                      className="font-[var(--font-sans)] font-medium text-[#F0F0F0]"
                      style={{ fontSize: 14 }}
                    >
                      {affiliate.totalSales} sale{affiliate.totalSales !== 1 ? "s" : ""} recorded
                    </p>
                    <p
                      className="mt-[4px] font-[var(--font-sans)]"
                      style={{ fontSize: 13, color: "#9CA4B7" }}
                    >
                      {formatCurrency(affiliate.totalRevenue, cur)} total revenue generated
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* View full sales link */}
            <button
              type="button"
              className="mt-[12px] flex items-center gap-[6px] font-[var(--font-sans)] font-medium transition-colors hover:text-[#F0F0F0]"
              style={{ fontSize: 13, color: "#5B8DEF" }}
            >
              View full sales history
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 3l4 4-4 4" />
              </svg>
            </button>
          </div>

          {/* ── Joined date ─────────────────────────────────────── */}
          <div
            className="mx-[32px]"
            style={{ height: 1, background: "rgba(255,255,255,0.06)" }}
          />
          <div className="mx-[32px] py-[16px]">
            <p
              className="font-[var(--font-sans)]"
              style={{ fontSize: 12, color: "#9CA4B7" }}
            >
              Joined {new Date(affiliate.joinedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        {/* ── Actions (sticky bottom) ───────────────────────────── */}
        <div
          className="shrink-0 border-t px-[32px] py-[20px]"
          style={{ borderTopColor: "rgba(255,255,255,0.06)" }}
        >
          {affiliate.status === "pending" ? (
            <div className="flex gap-[12px]">
              <button
                type="button"
                className="flex-1 rounded-[8px] border py-[10px] font-[var(--font-sans)] font-medium transition-colors hover:border-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]"
                style={{
                  fontSize: 14,
                  borderColor: "rgba(239,68,68,0.30)",
                  color: "#EF4444",
                }}
                onClick={onClose}
              >
                Reject
              </button>
              <button
                type="button"
                className="flex-1 rounded-[8px] py-[10px] font-[var(--font-sans)] font-medium text-white transition-colors hover:bg-[#16A34A]"
                style={{
                  fontSize: 14,
                  background: "#22C55E",
                }}
                onClick={onClose}
              >
                Approve
              </button>
            </div>
          ) : affiliate.status === "approved" ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-[8px] rounded-[8px] border py-[10px] font-[var(--font-sans)] font-medium transition-colors hover:border-[rgba(255,255,255,0.20)] hover:bg-[rgba(255,255,255,0.04)]"
              style={{
                fontSize: 14,
                borderColor: "rgba(255,255,255,0.12)",
                color: "#F0F0F0",
              }}
            >
              View Sales
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 3l4 4-4 4" />
              </svg>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-[8px] border py-[10px] font-[var(--font-sans)] font-medium transition-colors hover:border-[rgba(255,255,255,0.20)]"
              style={{
                fontSize: 14,
                borderColor: "rgba(255,255,255,0.12)",
                color: "#F0F0F0",
              }}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </>
  );
}
