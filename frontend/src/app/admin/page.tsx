"use client";

import { useTenant } from "@/modules/tenant-shell";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";

// ── Mock data (admin-specific) ────────────────────────────────────────────────

const ADMIN_KPI = {
  totalAffiliates: 247,
  pendingReview: 5,
  affiliateChange: 23,
  totalRevenue: 524800,
  revenueAffiliates: 247,
  revenueChangePct: 15.3,
  totalCommissionsPaid: 52480,
  commissionRate: 10,
  pendingApprovals: 18,
  pendingCommissions: 0,
  currency: "USD",
};

const TOP_AFFILIATES = [
  { rank: 1, name: "Sarah Chen", email: "sarah.c@email.com", referralCode: "sarah378", sales: 43500, tier: "platinum" as const },
  { rank: 2, name: "Michael Wong", email: "michael.w@email.com", referralCode: "michael294", sales: 32000, tier: "gold" as const },
  { rank: 3, name: "Emily Rodriguez", email: "emily.r@email.com", referralCode: "emily123", sales: 26000, tier: "gold" as const },
  { rank: 4, name: "David Kim", email: "david.k@email.com", referralCode: "david856", sales: 20500, tier: "silver" as const },
  { rank: 5, name: "Lisa Tan", email: "lisa.t@email.com", referralCode: "lisa555", sales: 19000, tier: "silver" as const },
];

const RECENT_ACTIVITY = [
  { id: "1", title: "New affiliate signup", person: "Alex Johnson", time: "5 min ago", color: "#F5A623" },
  { id: "2", title: "Status changed to Active", person: "Priya Sharma", time: "5 min ago", color: "#F5A623" },
  { id: "3", title: "Commission approved", person: "Tom Anderson", time: "1 hour ago", color: "#F5A623" },
  { id: "4", title: "Milestone unlocked", person: "Maria Garcia", time: "2 hours ago", color: "#F5A623" },
  { id: "5", title: "New asset uploaded", person: "Admin User", time: "3 hours ago", color: "#F5A623" },
];

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconApprove() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <path d="M12 7l1.5 1.5L16 5.5" />
    </svg>
  );
}

function IconCreateAsset() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="2" />
      <path d="M8 5v6M5 8h6" />
    </svg>
  );
}

function IconSetMilestone() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 2h8v5a4 4 0 01-8 0V2z" />
      <path d="M2 2h2M12 2h2" />
      <path d="M8 11v3M5 14h6" />
    </svg>
  );
}

// ── Tier badge ────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  platinum: { bg: "rgba(34,197,94,0.14)", text: "#22C55E" },
  gold:     { bg: "rgba(234,179,8,0.14)", text: "#EAB308" },
  silver:   { bg: "rgba(148,163,184,0.14)", text: "#94A3B8" },
  bronze:   { bg: "rgba(217,119,6,0.14)", text: "#D97706" },
};

function TierBadge({ tier }: { tier: string }) {
  const colors = TIER_COLORS[tier] ?? TIER_COLORS.bronze;
  return (
    <span
      className="inline-block rounded-[0.25rem] px-[0.5rem] py-[0.1rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
      style={{ background: colors.bg, color: colors.text }}
    >
      {tier}
    </span>
  );
}

// ── Rank badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  return (
    <div className="flex size-[2rem] items-center justify-center rounded-full border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)]">
      <span className="font-[var(--font-sans)] text-[var(--text-sm)] font-semibold text-[#F5A623]">
        {rank}
      </span>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function AdminKpiCard({
  label,
  value,
  subtitle,
  accentColor,
  change,
}: {
  label: string;
  value: string;
  subtitle: string;
  accentColor: string;
  change?: string;
}) {
  return (
    <div className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent px-[var(--space-5)] py-[var(--space-4)]">
      <div className="h-[2.5px] w-[2rem] rounded-full" style={{ background: accentColor }} />
      <dt className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] tracking-[var(--tracking-caption)] uppercase text-[rgba(255,255,255,0.50)]">
        {label}
      </dt>
      <dd className="font-[var(--font-display)] font-bold text-[2rem] leading-[1.1] tracking-[var(--tracking-heading)] text-[#FFFFFF]">
        {value}
      </dd>
      <dd className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] text-[rgba(255,255,255,0.45)]">
        {subtitle}
      </dd>
      {change && (
        <dd className="flex items-center gap-[0.25rem] font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] text-[#22C55E]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 8.5C4 6 6 4.5 10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {change}
        </dd>
      )}
    </div>
  );
}

// ── Hero Banner (admin variant) ───────────────────────────────────────────────

function AdminHeroBanner() {
  const { tenant } = useTenant();
  const eventName = tenant?.name?.startsWith("TOKEN2049")
    ? (tenant.name.includes("2026") ? tenant.name : `${tenant.name} 2026`).replace(/\s+/g, " ").trim()
    : tenant?.name ?? "TOKEN2049 Singapore 2026";

  return (
    <section
      className="relative flex min-h-[6.5rem] flex-col justify-center overflow-hidden rounded-[0.875rem] border border-[var(--color-border-ghost)] px-[2rem] py-[1.35rem]"
      style={{
        background: `linear-gradient(90deg,
          rgba(23,29,50,1.00) 0%,
          rgba(17,21,39,0.86) 7%,
          rgba(10,14,28,0.71) 14%,
          rgba(5,8,18,0.57) 21%,
          rgba(2,3,8,0.43) 29%,
          rgba(1,1,2,0.29) 36%,
          rgba(0,0,0,0.14) 43%,
          rgba(0,0,0,0) 50%,
          rgba(0,0,0,0) 100%
        ), linear-gradient(135deg, #1C4AA6 0%, #2855B8 40%, #1C4AA6 100%)`,
      }}
      aria-label="Welcome banner"
    >
      <h2 className="relative z-10 font-[var(--font-display)] text-[2.55rem] font-bold leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">
        Welcome Back, John!
      </h2>
      <p className="relative z-10 mt-[0.2rem] max-w-[46rem] font-[var(--font-sans)] text-[1.125rem] leading-[1.35] text-[rgba(255,255,255,0.9)]">
        Monitor and manage the {eventName} Affiliate Program
      </p>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const currency = ADMIN_KPI.currency;

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        {/* Hero Banner */}
        <AdminHeroBanner />

        {/* KPI Cards */}
        <dl className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2 lg:grid-cols-4">
          <AdminKpiCard
            label="Total Affiliates"
            value={String(ADMIN_KPI.totalAffiliates)}
            subtitle={`${ADMIN_KPI.pendingReview} pending review`}
            accentColor="#FFFFFF"
            change={`+${ADMIN_KPI.affiliateChange}`}
          />
          <AdminKpiCard
            label="Total Affiliate Revenue"
            value={formatCurrency(ADMIN_KPI.totalRevenue, currency)}
            subtitle={`${ADMIN_KPI.revenueAffiliates} affiliates`}
            accentColor="#5B8DEF"
            change={`+${ADMIN_KPI.revenueChangePct}%`}
          />
          <AdminKpiCard
            label="Total Commissions Paid"
            value={formatCurrency(ADMIN_KPI.totalCommissionsPaid, currency)}
            subtitle={`At ${ADMIN_KPI.commissionRate}% rate`}
            accentColor="#22C55E"
          />
          <AdminKpiCard
            label="Pending Approvals"
            value={String(ADMIN_KPI.pendingApprovals)}
            subtitle={`${ADMIN_KPI.pendingCommissions} commissions pending review`}
            accentColor="#5B8DEF"
          />
        </dl>

        {/* Quick Actions */}
        <section className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent px-[var(--space-6)] py-[var(--space-5)]">
          <h3 className="font-[var(--font-display)] font-bold text-[var(--text-lg)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
            Quick Actions
          </h3>
          <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-3)]">
            <button
              type="button"
              className="flex items-center gap-[0.5rem] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              <IconApprove />
              Approve Pending
            </button>
            <button
              type="button"
              className="flex items-center gap-[0.5rem] rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)]"
            >
              <IconCreateAsset />
              Create Asset
            </button>
            <button
              type="button"
              className="flex items-center gap-[0.5rem] rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)]"
            >
              <IconSetMilestone />
              Set Milestone
            </button>
          </div>
        </section>

        {/* Bottom row: Top Affiliates + Recent Activity */}
        <div className="grid grid-cols-1 gap-[var(--space-4)] lg:grid-cols-[1fr_22rem]">
          {/* Top Affiliates */}
          <section className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent px-[var(--space-6)] py-[var(--space-5)]">
            <div className="flex items-center justify-between">
              <h3 className="font-[var(--font-display)] font-bold text-[var(--text-lg)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
                Top Affiliates
              </h3>
              <button
                type="button"
                className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.2)]"
              >
                View all
              </button>
            </div>

            {/* Table header */}
            <div className="mt-[var(--space-4)] grid grid-cols-[2.5rem_1fr_7rem_5.5rem_5rem] items-center gap-[var(--space-3)] border-b border-[rgba(255,255,255,0.06)] pb-[var(--space-3)]">
              <span className="font-[var(--font-sans)] text-[var(--text-xs)] tracking-[var(--tracking-caption)] text-[rgba(255,255,255,0.45)]">
                Rank
              </span>
              <span className="font-[var(--font-sans)] text-[var(--text-xs)] tracking-[var(--tracking-caption)] text-[rgba(255,255,255,0.45)]">
                Name
              </span>
              <span className="font-[var(--font-sans)] text-[var(--text-xs)] tracking-[var(--tracking-caption)] text-[rgba(255,255,255,0.45)]">
                Referral Code
              </span>
              <span className="font-[var(--font-sans)] text-[var(--text-xs)] tracking-[var(--tracking-caption)] text-[rgba(255,255,255,0.45)]">
                Sales
              </span>
              <span className="font-[var(--font-sans)] text-[var(--text-xs)] tracking-[var(--tracking-caption)] text-[rgba(255,255,255,0.45)]">
                Tier
              </span>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-[rgba(255,255,255,0.06)]">
              {TOP_AFFILIATES.map((aff) => (
                <div
                  key={aff.rank}
                  className="grid grid-cols-[2.5rem_1fr_7rem_5.5rem_5rem] items-center gap-[var(--space-3)] py-[var(--space-3)]"
                >
                  <RankBadge rank={aff.rank} />
                  <div className="min-w-0">
                    <p className="truncate font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                      {aff.name}
                    </p>
                    <p className="truncate font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.45)]">
                      {aff.email}
                    </p>
                  </div>
                  <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.60)]">
                    {aff.referralCode}
                  </span>
                  <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">
                    {formatCurrency(aff.sales, currency)}
                  </span>
                  <TierBadge tier={aff.tier} />
                </div>
              ))}
            </div>
          </section>

          {/* Recent Activity */}
          <section className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent px-[var(--space-5)] py-[var(--space-5)]">
            <h3 className="font-[var(--font-display)] font-bold text-[var(--text-lg)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
              Recent Activity
            </h3>

            <div className="mt-[var(--space-4)] flex flex-col gap-[var(--space-5)]">
              {RECENT_ACTIVITY.map((item) => (
                <div key={item.id} className="flex items-start gap-[var(--space-3)]">
                  <span
                    className="mt-[0.35rem] size-[0.5rem] shrink-0 rounded-full"
                    style={{ background: item.color }}
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium leading-[var(--leading-snug)] text-[var(--color-text-primary)]">
                      {item.title}
                    </p>
                    <p className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] text-[rgba(255,255,255,0.50)]">
                      {item.person}
                    </p>
                    <p className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] text-[rgba(255,255,255,0.35)]">
                      {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </DashboardContainer>
    </DashboardStageCanvas>
  );
}
