"use client";

import Link from "next/link";
import { useTenant } from "@/modules/tenant-shell";
import { useAuth } from "@/modules/auth";
import { useDashboardSummary } from "@/modules/dashboard/hooks/use-dashboard-summary";
import { useTopAffiliates } from "@/modules/dashboard/hooks/use-top-affiliates";
import { useRecentActivity } from "@/modules/dashboard/hooks/use-recent-activity";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCurrency(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
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
      className="inline-block rounded-[var(--space-1)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
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
    <div
      className="flex h-full flex-col gap-[10px] rounded-[8px] p-[24px]"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%), rgba(21,26,43,0.8)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 10px 30px rgba(0,0,0,0.25)",
      }}
    >
      <div className="h-[4px] w-[64px] rounded-[50px]" style={{ background: accentColor }} />
      <dt className="font-[var(--font-sans)] text-[12px] leading-[16px] tracking-[0.5px] uppercase text-[rgba(166,209,255,0.75)]">
        {label}
      </dt>
      <dd className="font-[var(--font-sans)] text-[28px] font-bold leading-[42px] text-[#F0F0F0]">
        {value}
      </dd>
      <dd className="font-[var(--font-sans)] text-[12px] leading-[18px] text-[rgba(255,255,255,0.55)]">
        {subtitle}
      </dd>
      {change && (
        <dd className="flex items-center gap-[4px] font-[var(--font-sans)] text-[12px] leading-[18px] text-[#22C55E]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 12L6 7L9 10L14 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M10 4H14V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
  const { user } = useAuth();
  const firstName = user?.fullName?.split(" ")[0] ?? "there";
  const eventName = tenant?.name ?? "your";

  return (
    <section
      className="relative flex min-h-[166px] flex-col justify-center overflow-hidden rounded-[16px] border border-[rgba(255,255,255,0.1)] px-[48px] pt-[48px] pb-[40px]"
      style={{
        backgroundImage: "linear-gradient(172deg, rgb(19,32,84) 0%, rgb(21,38,95) 7%, rgb(22,43,106) 14%, rgb(24,49,118) 21%, rgb(25,55,130) 29%, rgb(26,61,142) 36%, rgb(27,68,154) 43%, rgb(28,74,166) 50%, rgb(28,67,148) 57%, rgb(28,61,131) 64%, rgb(28,55,114) 71%, rgb(27,48,97) 79%, rgb(26,42,81) 86%, rgb(25,35,65) 93%, rgb(23,29,50) 100%)",
      }}
      aria-label="Welcome banner"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{ background: "radial-gradient(ellipse at center, rgba(201,168,76,0.3), transparent 70%)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.3) 0%, transparent 50%)" }}
      />
      <h2 className="relative font-[var(--font-display)] text-[32px] font-bold leading-[32px] tracking-[-0.48px] text-[#F0F0F0]">
        Welcome Back, {firstName}!
      </h2>
      <p className="relative mt-[8px] max-w-[46rem] font-[var(--font-sans)] text-[18px] leading-[28px] text-[#F0F0F0]">
        Monitor and manage the {eventName} Affiliate Program
      </p>
    </section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function AdminDashboardPage() {
  const { tenant } = useTenant();
  const { data: summary } = useDashboardSummary(tenant?.id);
  const { data: topAffData } = useTopAffiliates(tenant?.id, 5);
  const { data: activityData } = useRecentActivity(tenant?.id);

  const currency = summary?.currency ?? "USD";
  const topAffiliates = topAffData?.affiliates ?? [];
  const activityItems = activityData?.items ?? [];

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        {/* Hero Banner */}
        <AdminHeroBanner />

        {/* KPI Cards */}
        <dl className="grid grid-cols-1 items-stretch gap-[24px] sm:grid-cols-2 lg:grid-cols-4">
          <AdminKpiCard
            label="Total Affiliates"
            value={String(summary?.totalAffiliates ?? 0)}
            subtitle="Active affiliates"
            accentColor="#FFFFFF"
          />
          <AdminKpiCard
            label="Total Affiliate Revenue"
            value={formatCurrency(summary?.totalRevenue ?? 0, currency)}
            subtitle={`${summary?.totalAffiliates ?? 0} affiliates`}
            accentColor="#5B8DEF"
          />
          <AdminKpiCard
            label="Total Commissions Paid"
            value={formatCurrency(summary?.totalCommissions ?? 0, currency)}
            subtitle={`${summary?.conversionRate ?? 0}% conversion`}
            accentColor="#22C55E"
          />
          <AdminKpiCard
            label="Pending Approvals"
            value={String(summary?.pendingApprovals ?? 0)}
            subtitle="Awaiting review"
            accentColor="#F5A623"
          />
        </dl>

        {/* Quick Actions */}
        <section
          className="rounded-[8px] p-[24px]"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(21,26,43,0.5)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.2)",
          }}
        >
          <h3 className="font-[var(--font-display)] font-bold text-[var(--text-lg)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
            Quick Actions
          </h3>
          <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-3)]">
            <Link
              href="/admin/affiliates?status=pending"
              className="flex items-center gap-[var(--space-2)] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
            >
              <IconApprove />
              Approve Pending
            </Link>
            <Link
              href="/admin/materials"
              className="flex items-center gap-[var(--space-2)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)]"
            >
              <IconCreateAsset />
              Create Asset
            </Link>
            <Link
              href="/admin/milestones"
              className="flex items-center gap-[var(--space-2)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.2)] hover:bg-[rgba(255,255,255,0.04)]"
            >
              <IconSetMilestone />
              Set Milestone
            </Link>
          </div>
        </section>

        {/* Bottom row: Top Affiliates + Recent Activity */}
        <div className="grid grid-cols-1 gap-[24px] lg:grid-cols-[2fr_1fr]">
          {/* Top Affiliates */}
          <section
            className="rounded-[8px] p-[24px]"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(21,26,43,0.5)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-[var(--font-display)] font-bold text-[var(--text-lg)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
                Top Affiliates
              </h3>
              <Link
                href="/admin/affiliates"
                className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.2)]"
              >
                View all
              </Link>
            </div>

            {/* Table header — grid sized for breathing room between right-side columns */}
            <div className="mt-[var(--space-4)] grid grid-cols-[2.5rem_minmax(0,1fr)_8rem_7rem_5.5rem] items-center gap-[var(--space-6)] border-b border-[rgba(255,255,255,0.06)] pb-[var(--space-3)]">
              <span className="font-[var(--font-sans)] text-[var(--text-xs)] tracking-[var(--tracking-caption)] text-[rgba(255,255,255,0.45)]">
                Rank
              </span>
              <span className="font-[var(--font-sans)] text-[var(--text-xs)] tracking-[var(--tracking-caption)] text-[rgba(255,255,255,0.45)]">
                Name
              </span>
              <span className="font-[var(--font-sans)] text-[var(--text-xs)] tracking-[var(--tracking-caption)] text-[rgba(255,255,255,0.45)]">
                Referral Code
              </span>
              <span className="text-right font-[var(--font-sans)] text-[var(--text-xs)] tracking-[var(--tracking-caption)] text-[rgba(255,255,255,0.45)]">
                Revenue
              </span>
              <span className="text-center font-[var(--font-sans)] text-[var(--text-xs)] tracking-[var(--tracking-caption)] text-[rgba(255,255,255,0.45)]">
                Tier
              </span>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-[rgba(255,255,255,0.06)]">
              {topAffiliates.map((aff, i) => (
                <div
                  key={aff.id}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)_8rem_7rem_5.5rem] items-center gap-[var(--space-6)] py-[var(--space-3)]"
                >
                  <RankBadge rank={i + 1} />
                  <div className="min-w-0">
                    <p className="truncate font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                      {aff.name}
                    </p>
                    <p className="truncate font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.45)]">
                      {aff.email}
                    </p>
                  </div>
                  <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.60)]">
                    {aff.referralCode ?? "—"}
                  </span>
                  <span className="text-right tabular-nums font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">
                    {formatCurrency(aff.totalRevenue, currency)}
                  </span>
                  <div className="flex justify-center">
                    <TierBadge tier={
                      aff.totalRevenue >= 250000 ? "platinum" :
                      aff.totalRevenue >= 100000 ? "gold" :
                      aff.totalRevenue >= 50000 ? "silver" :
                      aff.totalRevenue > 0 ? "bronze" : "—"
                    } />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Recent Activity */}
          <section
            className="rounded-[8px] p-[24px]"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(21,26,43,0.5)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 8px 24px rgba(0,0,0,0.2)",
            }}
          >
            <h3 className="font-[var(--font-display)] font-bold text-[var(--text-lg)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
              Recent Activity
            </h3>

            <div className="mt-[var(--space-4)] flex flex-col gap-[20px]">
              {activityItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-start gap-[var(--space-3)]">
                  <span
                    className="mt-[8px] size-[var(--space-2)] shrink-0 rounded-full"
                    style={{ background: "#F5A623" }}
                    aria-hidden="true"
                  />
                  <div className="flex min-w-0 flex-col gap-[4px]">
                    <p className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium leading-[20px] text-[var(--color-text-primary)]">
                      {item.description}
                    </p>
                    <p className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[16px] text-[rgba(255,255,255,0.50)]">
                      {item.affiliateName}
                    </p>
                    <p className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[16px] text-[rgba(255,255,255,0.35)]">
                      {timeAgo(item.timestamp)}
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
