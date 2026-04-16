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

// Figma 60:2705 — exact tier colors
const TIER_STYLES = {
  bronze: {
    tileText: "#CD7F32",
    tileBorder: "rgba(205,127,50,0.4)",
    tileBg: "rgba(205,127,50,0.2)",
    progress: "linear-gradient(90deg, rgb(205,127,50) 0%, rgb(184,115,51) 100%)",
  },
  silver: {
    tileText: "#C0C0C0",
    tileBorder: "rgba(192,192,192,0.4)",
    tileBg: "rgba(192,192,192,0.2)",
    progress: "linear-gradient(90deg, rgb(192,192,192) 0%, rgb(168,168,168) 100%)",
  },
  gold: {
    tileText: "#FFD700",
    tileBorder: "rgba(255,215,0,0.4)",
    tileBg: "rgba(255,215,0,0.2)",
    progress: "linear-gradient(90deg, rgb(255,215,0) 0%, rgb(255,165,0) 100%)",
  },
  platinum: {
    tileText: "#E5E4E2",
    tileBorder: "rgba(229,228,226,0.4)",
    tileBg: "rgba(229,228,226,0.2)",
    progress: "linear-gradient(90deg, rgb(229,228,226) 0%, rgb(192,192,192) 100%)",
  },
} as const;

// Locked state: muted colors for tiles that haven't been reached
const LOCKED_TILE = {
  tileBorder: "rgba(255,255,255,0.12)",
  tileBg: "rgba(255,255,255,0.04)",
};

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
        className="flex size-[64px] shrink-0 items-center justify-center rounded-[8px] border-2 font-[var(--font-display)] text-[28px] font-bold leading-[32px]"
        style={{
          borderColor: unlocked ? tileBorder : LOCKED_TILE.tileBorder,
          color: unlocked ? tileText : "rgba(255,255,255,0.3)",
          background: unlocked ? tileBg : LOCKED_TILE.tileBg,
        }}
        aria-hidden="true"
      >
        {letter}
      </div>
      {unlocked ? (
        <span className="absolute -right-[6px] -top-[8px] flex size-[24px] items-center justify-center rounded-full border-2 border-[#151A2B] bg-[#22C55E] text-white">
          <IconCheck />
        </span>
      ) : null}
    </div>
  );
}

function MilestoneCardSkeleton() {
  return (
    <article
      className="rounded-[8px] p-[28px]"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(21,26,43,0.5)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.2)",
      }}
    >
      <div className="flex items-start gap-[24px]">
        <div className="size-[64px] shrink-0 animate-pulse rounded-[8px] bg-[rgba(255,255,255,0.06)]" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-[24px]">
            <div className="h-[28px] w-[80px] animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.06)]" />
            <div className="h-[1px] w-[40px] bg-[rgba(255,255,255,0.06)]" />
            <div className="h-[24px] w-[60px] animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.06)]" />
          </div>
          <div className="mt-[12px] h-[21px] w-[60%] animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.06)]" />
          <div className="mt-[16px] flex items-center justify-between">
            <div className="h-[14px] w-[40%] animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.06)]" />
            <div className="h-[14px] w-[50px] animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.06)]" />
          </div>
          <div className="mt-[8px] h-[8px] w-full animate-pulse rounded-full bg-[rgba(255,255,255,0.06)]" />
        </div>
      </div>
    </article>
  );
}

function MilestoneCard({
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

  return (
    <article
      className="rounded-[8px] p-[28px]"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(21,26,43,0.5)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.05), 0 8px 24px rgba(0,0,0,0.2)",
      }}
    >
      <div className="flex items-start gap-[24px]">
        <TierTile
          letter={letter}
          tileText={styles.tileText}
          tileBorder={styles.tileBorder}
          tileBg={styles.tileBg}
          unlocked={unlocked}
        />
        <div className="min-w-0 flex-1">
          {/* Title row — Figma: Oswald Bold 20px + line + Medium 16px amount */}
          <div className="flex items-center gap-[24px]">
            <h2 className="font-[var(--font-display)] text-[20px] font-bold leading-[28px] tracking-[-0.3px] text-[#F0F0F0]">
              {name}
            </h2>
            <span className="inline-block h-[1px] w-[40px] bg-[rgba(255,255,255,0.42)]" />
            <p className="font-[var(--font-sans)] text-[16px] font-medium leading-[24px] text-[#F0F0F0]">
              {formatCurrency(targetAmount, currency)}
            </p>
          </div>

          {/* Description — Figma: Regular 14px, #9CA4B7 */}
          <p className="mt-[12px] font-[var(--font-sans)] text-[14px] leading-[21px] text-[#9CA4B7]">
            {description}
          </p>

          {/* Progress section */}
          <div className="mt-[16px] flex flex-col gap-[8px]">
            <div className="flex items-center justify-between">
              <p className="font-[var(--font-sans)] text-[12px] leading-[14px] text-[#9CA4B7]">
                {formatCurrency(effectiveCurrent, currency)} / {formatCurrency(targetAmount, currency)} ({Math.round(pct)}%)
              </p>
              <span className={`font-[var(--font-sans)] text-[12px] leading-[14px] ${unlocked ? "text-[#22C55E]" : "text-[#F0F0F0]"}`}>
                {unlocked ? "Unlocked!" : "Locked"}
              </span>
            </div>

            {/* Progress bar — 8px, colored when unlocked/progressing, grey when locked/0% */}
            <div
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${name} milestone progress`}
              className="h-[8px] w-full overflow-hidden rounded-full border border-[rgba(255,255,255,0.1)] bg-[#0D1420] p-[1px]"
            >
              {pct > 0 && (
                <div
                  className="h-full rounded-full transition-[width] duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundImage: styles.progress,
                    boxShadow: unlocked ? `0 0 6px ${styles.tileText}40` : "none",
                  }}
                />
              )}
            </div>
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
          <div className="flex flex-col gap-[16px]">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => <MilestoneCardSkeleton key={index} />)
              : tiers.map((tier) => <MilestoneCard key={tier.id} {...tier} />)}
          </div>
        </section>
      </DashboardContainer>
    </DashboardStageCanvas>
  );
}
