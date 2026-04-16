"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useMilestoneTiers } from "@/modules/milestones";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";

function formatCurrency(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 8 7 12 13 4" />
    </svg>
  );
}

const TIER_STYLES = {
  bronze: {
    tileText: "#E19A3E",
    tileBorder: "#9F6B33",
    tileBg: "rgba(225,154,62,0.12)",
    progress: "#D8913D",
  },
  silver: {
    tileText: "#DADCE3",
    tileBorder: "#8F93A0",
    tileBg: "rgba(218,220,227,0.12)",
    progress: "#E5E7EB",
  },
  gold: {
    tileText: "#FFD620",
    tileBorder: "#9E8F19",
    tileBg: "rgba(255,214,32,0.12)",
    progress: "#FFC800",
  },
  platinum: {
    tileText: "#E2E4EB",
    tileBorder: "#8C909D",
    tileBg: "rgba(226,228,235,0.12)",
    progress: "#E5E7EB",
  },
} as const;

function TierTile({
  letter,
  tileText,
  tileBorder,
  tileBg,
  unlocked,
}: {
  letter: string;
  tileText: string;
  tileBorder: string;
  tileBg: string;
  unlocked: boolean;
}) {
  return (
    <div className="relative">
      <div
        className="flex size-[4rem] shrink-0 items-center justify-center rounded-[var(--radius-md)] border-[1.5px] font-[var(--font-display)] text-[var(--text-xl)] font-bold leading-none"
        style={{
          borderColor: tileBorder,
          color: tileText,
          background: tileBg,
        }}
        aria-hidden="true"
      >
        {letter}
      </div>
      {unlocked ? (
        <span className="absolute -right-[6px] -top-[6px] flex size-[1.5rem] items-center justify-center rounded-full bg-[var(--color-success)] text-white shadow-[0_0_0_2px_rgba(24,28,47,0.96)]">
          <IconCheck />
        </span>
      ) : null}
    </div>
  );
}

function MilestoneCardSkeleton() {
  return (
    <article className="overflow-hidden rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.08)] bg-[#181d30] p-[var(--space-6)]">
      <div className="flex items-start gap-[var(--space-6)]">
        <div className="size-[4rem] shrink-0 animate-pulse rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.08)]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[var(--space-6)]">
            <div className="h-[1.75rem] w-[5rem] animate-pulse rounded-[var(--space-1)] bg-[rgba(255,255,255,0.08)]" />
            <div className="h-[1px] w-[var(--space-10)] bg-[rgba(255,255,255,0.08)]" />
            <div className="h-[1.5rem] w-[4rem] animate-pulse rounded-[var(--space-1)] bg-[rgba(255,255,255,0.08)]" />
          </div>
          <div className="mt-[var(--space-3)] h-[1.3125rem] w-[60%] animate-pulse rounded-[var(--space-1)] bg-[rgba(255,255,255,0.08)]" />
          <div className="mt-[var(--space-3)] flex items-center justify-between">
            <div className="h-[0.875rem] w-[40%] animate-pulse rounded-[var(--space-1)] bg-[rgba(255,255,255,0.08)]" />
            <div className="h-[0.875rem] w-[3.5rem] animate-pulse rounded-[var(--space-1)] bg-[rgba(255,255,255,0.08)]" />
          </div>
          <div className="mt-[var(--space-2)] h-[0.5rem] w-full animate-pulse rounded-full bg-[rgba(255,255,255,0.08)]" />
        </div>
      </div>
    </article>
  );
}

function MilestoneCard({
  id,
  name,
  letter,
  targetAmount,
  currentAmount,
  currency,
  description,
  unlocked,
}: {
  id: string;
  name: string;
  letter: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  description: string;
  unlocked: boolean;
}) {
  const styles = TIER_STYLES[name.toLowerCase() as keyof typeof TIER_STYLES] ?? TIER_STYLES.bronze;
  const effectiveCurrent = unlocked ? targetAmount : currentAmount;
  const pct = Math.min(100, (effectiveCurrent / targetAmount) * 100);
  const fillColor = styles.progress;

  return (
    <article className="overflow-hidden rounded-[var(--radius-md)] border border-[rgba(255,255,255,0.1)] bg-[#181d30] p-[var(--space-6)]">
      <div className="flex items-start gap-[var(--space-6)]">
        <TierTile
          letter={letter}
          tileText={styles.tileText}
          tileBorder={styles.tileBorder}
          tileBg={styles.tileBg}
          unlocked={unlocked}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[var(--space-6)]">
            <h2 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold leading-[1.75rem] text-[var(--color-text-primary)]">
              {name}
            </h2>
            <span className="inline-block h-[1px] w-[var(--space-10)] bg-[rgba(255,255,255,0.42)]" />
            <p className="font-[var(--font-display)] text-[1.125rem] font-bold leading-[1.5rem] text-[var(--color-text-primary)]">
              {formatCurrency(targetAmount, currency)}
            </p>
          </div>

          <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.3125rem] text-[rgba(255,255,255,0.56)]">
            {description}
          </p>

          <div className="mt-[var(--space-3)] flex items-center justify-between gap-[var(--space-4)]">
            <p className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[0.875rem] text-[rgba(255,255,255,0.62)]">
              {formatCurrency(effectiveCurrent, currency)} / {formatCurrency(targetAmount, currency)} ({Math.round(pct)}%)
            </p>
            <span className={`font-[var(--font-sans)] text-[var(--text-xs)] leading-[0.875rem] ${unlocked ? "text-[var(--color-success)]" : "text-[rgba(255,255,255,0.68)]"}`}>
              {unlocked ? "Unlocked!" : "Locked"}
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${name} milestone progress`}
            className="mt-[var(--space-2)] h-[0.5rem] w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.14)] p-[1px]"
          >
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{ width: `${Math.max(pct, 0)}%`, background: fillColor }}
            />
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MilestonesPage() {
  const { tenant } = useTenant();
  const { data, isLoading } = useMilestoneTiers(tenant?.id);

  const tiers = data?.tiers ?? [];

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        <section className="w-full">
          <div className="space-y-[var(--space-4)]">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => <MilestoneCardSkeleton key={index} />)
              : tiers.map((tier) => <MilestoneCard key={tier.id} {...tier} />)}
          </div>
        </section>
      </DashboardContainer>
    </DashboardStageCanvas>
  );
}
