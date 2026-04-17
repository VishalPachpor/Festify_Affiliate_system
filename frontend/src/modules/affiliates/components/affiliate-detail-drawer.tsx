"use client";

import { useState } from "react";
import type { Affiliate } from "@/modules/affiliates/types";

// ── Tier palette ─────────────────────────────────────────────────────────────

type TierKey = "platinum" | "gold" | "silver" | "bronze";

const TIER_PALETTE: Record<
  TierKey,
  {
    solid: string;
    ring: string;
    glow: string;
    chipBg: string;
    chipText: string;
    chipBorder: string;
    gradient: string;
  }
> = {
  platinum: {
    solid: "#E5E4E2",
    ring: "rgba(229,228,226,0.35)",
    glow: "rgba(229,228,226,0.18)",
    chipBg: "rgba(229,228,226,0.10)",
    chipText: "#E5E4E2",
    chipBorder: "rgba(229,228,226,0.22)",
    gradient:
      "radial-gradient(120% 100% at 50% 0%, rgba(229,228,226,0.18) 0%, rgba(229,228,226,0.06) 40%, rgba(17,21,37,0) 100%)",
  },
  gold: {
    solid: "#FFD700",
    ring: "rgba(255,215,0,0.30)",
    glow: "rgba(255,215,0,0.14)",
    chipBg: "rgba(255,215,0,0.10)",
    chipText: "#FFD700",
    chipBorder: "rgba(255,215,0,0.22)",
    gradient:
      "radial-gradient(120% 100% at 50% 0%, rgba(255,215,0,0.16) 0%, rgba(255,215,0,0.05) 40%, rgba(17,21,37,0) 100%)",
  },
  silver: {
    solid: "#C0C0C0",
    ring: "rgba(192,192,192,0.32)",
    glow: "rgba(192,192,192,0.15)",
    chipBg: "rgba(192,192,192,0.10)",
    chipText: "#C0C0C0",
    chipBorder: "rgba(192,192,192,0.22)",
    gradient:
      "radial-gradient(120% 100% at 50% 0%, rgba(192,192,192,0.16) 0%, rgba(192,192,192,0.05) 40%, rgba(17,21,37,0) 100%)",
  },
  bronze: {
    solid: "#CD7F32",
    ring: "rgba(205,127,50,0.32)",
    glow: "rgba(205,127,50,0.14)",
    chipBg: "rgba(205,127,50,0.10)",
    chipText: "#E9A66A",
    chipBorder: "rgba(205,127,50,0.22)",
    gradient:
      "radial-gradient(120% 100% at 50% 0%, rgba(205,127,50,0.16) 0%, rgba(205,127,50,0.05) 40%, rgba(17,21,37,0) 100%)",
  },
};

const NEUTRAL_PALETTE = {
  solid: "#5B8DEF",
  ring: "rgba(91,141,239,0.30)",
  glow: "rgba(91,141,239,0.14)",
  chipBg: "rgba(255,255,255,0.04)",
  chipText: "rgba(255,255,255,0.55)",
  chipBorder: "rgba(255,255,255,0.10)",
  gradient:
    "radial-gradient(120% 100% at 50% 0%, rgba(91,141,239,0.14) 0%, rgba(91,141,239,0.04) 40%, rgba(17,21,37,0) 100%)",
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

// ── Icons ────────────────────────────────────────────────────────────────────

function IconClose() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 5l10 10M15 5L5 15" />
    </svg>
  );
}

function IconCopy() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="8" height="8" rx="1.5" />
      <path d="M10 4V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7.5l3 3 5-6" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h8M7 3l4 4-4 4" />
    </svg>
  );
}

function IconRevenue() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 1v12M10 3.5H5.5A1.5 1.5 0 0 0 5.5 6.5h3a1.5 1.5 0 0 1 0 3H4" />
    </svg>
  );
}

function IconCommission() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="5" cy="5" r="1.5" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="M11 3 3 11" />
    </svg>
  );
}

function IconCart() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 2h1.5l1.5 8h6.5l1-5H4" />
      <circle cx="5.5" cy="12" r="0.8" />
      <circle cx="10.5" cy="12" r="0.8" />
    </svg>
  );
}

function IconCalendar() {
  return (
    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="10" height="9" rx="1.5" />
      <path d="M2 6h10M5 2v2M9 2v2" />
    </svg>
  );
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

  const tierKey = (affiliate.tier ?? "") as TierKey;
  const palette = TIER_PALETTE[tierKey] ?? NEUTRAL_PALETTE;
  const cur = currency ?? affiliate.currency ?? "USD";

  const statusDisplay =
    affiliate.status === "approved" ? "active" : affiliate.status;

  const statusStyle =
    statusDisplay === "active"
      ? { dot: "#22C55E", text: "rgba(34,197,94,0.85)", bg: "rgba(34,197,94,0.10)" }
      : statusDisplay === "pending"
        ? { dot: "#EAB308", text: "#EAB308", bg: "rgba(234,179,8,0.12)" }
        : { dot: "#EF4444", text: "#EF4444", bg: "rgba(239,68,68,0.12)" };

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
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[32rem] flex-col bg-[var(--color-surface-card)] shadow-[var(--shadow-card)] transition-transform duration-300 ease-out"
        style={{ borderLeft: `1px solid var(--color-border)` }}
        role="dialog"
        aria-modal="true"
        aria-label="Affiliate details"
      >
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* ── Hero header with tier gradient ──────────────────── */}
          <div
            className="relative"
            style={{
              paddingLeft: "var(--space-8)",
              paddingRight: "var(--space-8)",
              paddingTop: "var(--space-8)",
              paddingBottom: "var(--space-6)",
              background: palette.gradient,
            }}
          >
            {/* Close button — floating top-right */}
            <button
              type="button"
              onClick={onClose}
              className="absolute flex items-center justify-center rounded-full text-[rgba(255,255,255,0.55)] transition-colors hover:bg-[rgba(255,255,255,0.08)] hover:text-[var(--color-text-primary)]"
              style={{
                top: "var(--space-4)",
                right: "var(--space-4)",
                width: 32,
                height: 32,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--color-border)",
              }}
              aria-label="Close drawer"
            >
              <IconClose />
            </button>

            {/* Avatar with tier ring */}
            <div className="flex flex-col items-center">
              <div
                className="relative flex items-center justify-center"
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  background: palette.glow,
                  padding: 4,
                }}
              >
                <div
                  className="flex h-full w-full items-center justify-center rounded-full"
                  style={{
                    background: palette.solid,
                    boxShadow: `0 0 0 2px ${palette.ring}, 0 8px 24px ${palette.glow}`,
                  }}
                >
                  <span
                    className="font-semibold"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 28,
                      color: tierKey === "gold" || tierKey === "platinum" || tierKey === "silver" ? "#0C0E1A" : "#FFFFFF",
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {initials}
                  </span>
                </div>
              </div>

              {/* Name */}
              <h2
                className="font-bold leading-none text-[var(--color-text-primary)]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-xl)",
                  letterSpacing: "var(--tracking-heading)",
                  marginTop: "var(--space-4)",
                }}
              >
                {affiliate.name}
              </h2>

              {/* Email */}
              <p
                className="text-[var(--color-text-secondary)]"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  marginTop: "var(--space-2)",
                }}
              >
                {affiliate.email}
              </p>

              {/* Badges row */}
              <div
                className="flex items-center"
                style={{ gap: "var(--space-2)", marginTop: "var(--space-4)" }}
              >
                {/* Tier pill */}
                {TIER_PALETTE[tierKey] ? (
                  <span
                    className="inline-flex items-center font-semibold capitalize"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-xs)",
                      background: palette.chipBg,
                      color: palette.chipText,
                      border: `1px solid ${palette.chipBorder}`,
                      borderRadius: "var(--radius-sm)",
                      padding: "4px 10px",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: palette.solid,
                      }}
                    />
                    {affiliate.tier}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center font-medium"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-xs)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.40)",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-sm)",
                      padding: "4px 10px",
                    }}
                  >
                    No tier
                  </span>
                )}

                {/* Status pill with dot */}
                <span
                  className="inline-flex items-center font-semibold capitalize"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-xs)",
                    background: statusStyle.bg,
                    color: statusStyle.text,
                    borderRadius: "var(--radius-sm)",
                    padding: "4px 10px",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: statusStyle.dot,
                      boxShadow:
                        statusDisplay === "active"
                          ? `0 0 0 3px rgba(34,197,94,0.15)`
                          : "none",
                    }}
                  />
                  {statusDisplay}
                </span>
              </div>

              {/* Referral code pill with copy */}
              {affiliate.referralCode && (
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="inline-flex items-center transition-colors hover:border-[var(--color-border-hover)]"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "var(--text-xs)",
                    color: codeCopied ? "#22C55E" : "var(--color-text-secondary)",
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${codeCopied ? "rgba(34,197,94,0.35)" : "var(--color-border)"}`,
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 12px",
                    marginTop: "var(--space-3)",
                    gap: 8,
                    letterSpacing: "0.02em",
                  }}
                  aria-label="Copy referral code"
                >
                  <span style={{ fontWeight: 500 }}>{affiliate.referralCode}</span>
                  <span
                    style={{
                      width: 1,
                      height: 12,
                      background: "var(--color-border)",
                    }}
                  />
                  {codeCopied ? <IconCheck /> : <IconCopy />}
                  <span
                    className="font-sans"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {codeCopied ? "Copied" : "Copy"}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* ── Primary stats ─ Revenue + Commission (hero cards) ── */}
          <div
            className="grid grid-cols-2"
            style={{
              marginLeft: "var(--space-8)",
              marginRight: "var(--space-8)",
              marginTop: "var(--space-2)",
              gap: "var(--space-3)",
            }}
          >
            <StatCardPrimary
              label="Total Revenue"
              value={formatCurrency(affiliate.totalRevenue, cur)}
              icon={<IconRevenue />}
              accent="#F0F0F0"
              iconBg="rgba(255,255,255,0.05)"
              iconColor="#9CA4B7"
            />
            <StatCardPrimary
              label="Total Commission"
              value={formatCurrency(affiliate.totalCommission, cur)}
              icon={<IconCommission />}
              accent="#E5BE52"
              iconBg="rgba(201,168,76,0.10)"
              iconColor="#E5BE52"
            />
          </div>

          {/* ── Secondary quick-stats row ───────────────────────── */}
          <div
            className="grid grid-cols-2"
            style={{
              marginLeft: "var(--space-8)",
              marginRight: "var(--space-8)",
              marginTop: "var(--space-3)",
              gap: "var(--space-3)",
            }}
          >
            <StatCardCompact
              label="Total Sales"
              value={affiliate.totalSales.toString()}
              icon={<IconCart />}
            />
            <StatCardCompact
              label="Avg. Sale"
              value={
                affiliate.totalSales > 0
                  ? formatCurrency(
                      Math.round(affiliate.totalRevenue / affiliate.totalSales),
                      cur,
                    )
                  : "--"
              }
              icon={<IconRevenue />}
            />
          </div>

          {/* ── Recent Sales section ─────────────────────────────── */}
          <div
            style={{
              marginLeft: "var(--space-8)",
              marginRight: "var(--space-8)",
              marginTop: "var(--space-8)",
            }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="font-bold text-[var(--color-text-primary)]"
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "var(--text-base)",
                  letterSpacing: "-0.02em",
                }}
              >
                Recent Activity
              </h3>
              {affiliate.totalSales > 0 && (
                <span
                  className="font-medium text-[var(--color-text-secondary)]"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-xs)",
                  }}
                >
                  {affiliate.totalSales} {affiliate.totalSales === 1 ? "sale" : "sales"}
                </span>
              )}
            </div>

            {affiliate.totalSales === 0 ? (
              <div
                className="flex flex-col items-center justify-center"
                style={{
                  marginTop: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px dashed var(--color-border)",
                  padding: "var(--space-8) var(--space-4)",
                }}
              >
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.03)",
                    color: "rgba(255,255,255,0.30)",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  <IconCart />
                </div>
                <p
                  className="font-medium"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-sm)",
                    color: "rgba(255,255,255,0.55)",
                  }}
                >
                  No sales yet
                </p>
                <p
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-xs)",
                    color: "rgba(255,255,255,0.30)",
                    marginTop: 4,
                  }}
                >
                  Sales will appear here once attributed
                </p>
              </div>
            ) : (
              <div
                className="flex items-center"
                style={{
                  marginTop: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--color-border)",
                  padding: "var(--space-4)",
                  gap: "var(--space-3)",
                }}
              >
                <div
                  className="flex shrink-0 items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(34,197,94,0.10)",
                    color: "#22C55E",
                  }}
                >
                  <IconCart />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="font-semibold text-[var(--color-text-primary)]"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-sm)",
                    }}
                  >
                    {affiliate.totalSales} {affiliate.totalSales === 1 ? "sale" : "sales"} recorded
                  </p>
                  <p
                    className="text-[var(--color-text-secondary)]"
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: "var(--text-xs)",
                      marginTop: 2,
                    }}
                  >
                    {formatCurrency(affiliate.totalRevenue, cur)} total revenue generated
                  </p>
                </div>
                <button
                  type="button"
                  className="flex shrink-0 items-center transition-colors hover:text-[var(--color-text-primary)]"
                  style={{
                    fontFamily: "var(--font-sans)",
                    fontSize: "var(--text-xs)",
                    color: "#A6D1FF",
                    fontWeight: 500,
                    gap: 4,
                  }}
                >
                  View all
                  <IconArrowRight />
                </button>
              </div>
            )}
          </div>

          {/* ── Meta / Joined ───────────────────────────────────── */}
          <div
            className="flex items-center"
            style={{
              marginTop: "var(--space-8)",
              marginLeft: "var(--space-8)",
              marginRight: "var(--space-8)",
              paddingTop: "var(--space-4)",
              paddingBottom: "var(--space-6)",
              borderTop: "1px solid var(--color-border)",
              gap: 8,
              color: "var(--color-text-secondary)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-xs)",
            }}
          >
            <IconCalendar />
            <span>
              Joined{" "}
              {new Date(affiliate.joinedAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
        </div>

        {/* ── Sticky footer actions ───────────────────────────────── */}
        <div
          className="shrink-0"
          style={{
            paddingLeft: "var(--space-8)",
            paddingRight: "var(--space-8)",
            paddingTop: "var(--space-4)",
            paddingBottom: "var(--space-5)",
            borderTop: "1px solid var(--color-border)",
            background: "rgba(12,14,26,0.6)",
            backdropFilter: "blur(8px)",
          }}
        >
          {affiliate.status === "pending" ? (
            <div className="flex" style={{ gap: "var(--space-3)" }}>
              <button
                type="button"
                className="flex-1 font-medium transition-colors hover:border-[#EF4444] hover:bg-[rgba(239,68,68,0.08)]"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  height: "var(--size-btn)",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid rgba(239,68,68,0.30)",
                  color: "#EF4444",
                  background: "transparent",
                }}
                onClick={onClose}
              >
                Reject
              </button>
              <button
                type="button"
                className="flex-1 font-semibold text-white transition-colors hover:bg-[#16A34A]"
                style={{
                  fontFamily: "var(--font-sans)",
                  fontSize: "var(--text-sm)",
                  height: "var(--size-btn)",
                  borderRadius: "var(--radius-md)",
                  background: "#22C55E",
                  boxShadow: "0 4px 12px rgba(34,197,94,0.25)",
                }}
                onClick={onClose}
              >
                Approve
              </button>
            </div>
          ) : affiliate.status === "approved" ? (
            <button
              type="button"
              className="flex w-full items-center justify-center font-semibold text-white transition-all hover:brightness-110"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                height: "var(--size-btn)",
                borderRadius: "var(--radius-md)",
                background: "var(--color-primary)",
                boxShadow: "0 4px 12px rgba(28,74,166,0.35)",
                gap: 8,
              }}
            >
              View Sales History
              <IconArrowRight />
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full font-medium transition-colors hover:border-[var(--color-border-hover)]"
              style={{
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-sm)",
                height: "var(--size-btn)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text-primary)",
                background: "transparent",
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

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCardPrimary({
  label,
  value,
  icon,
  accent,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.025)",
        border: "1px solid var(--color-border)",
        padding: "var(--space-4)",
      }}
    >
      <div className="flex items-center" style={{ gap: 8 }}>
        <div
          className="flex items-center justify-center"
          style={{
            width: 24,
            height: 24,
            borderRadius: "var(--radius-sm)",
            background: iconBg,
            color: iconColor,
          }}
        >
          {icon}
        </div>
        <span
          className="font-medium uppercase"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 11,
            color: "var(--color-text-secondary)",
            letterSpacing: "0.06em",
          }}
        >
          {label}
        </span>
      </div>
      <p
        className="font-bold"
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-lg)",
          color: accent,
          marginTop: "var(--space-3)",
          letterSpacing: "-0.02em",
        }}
      >
        {value}
      </p>
    </div>
  );
}

function StatCardCompact({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center"
      style={{
        borderRadius: "var(--radius-md)",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid var(--color-border)",
        padding: "var(--space-3) var(--space-4)",
        gap: "var(--space-3)",
      }}
    >
      <div
        className="flex items-center justify-center"
        style={{
          width: 28,
          height: 28,
          borderRadius: "var(--radius-sm)",
          background: "rgba(255,255,255,0.03)",
          color: "var(--color-text-secondary)",
        }}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className="uppercase"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: 10,
            color: "var(--color-text-secondary)",
            letterSpacing: "0.06em",
            fontWeight: 500,
          }}
        >
          {label}
        </p>
        <p
          className="font-bold text-[var(--color-text-primary)]"
          style={{
            fontFamily: "var(--font-sans)",
            fontSize: "var(--text-base)",
            marginTop: 2,
            letterSpacing: "-0.01em",
          }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
