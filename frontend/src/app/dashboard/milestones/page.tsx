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

function formatRatePct(bps: number): string {
  const pct = bps / 100;
  return Number.isInteger(pct) ? `${pct}%` : `${pct.toFixed(1)}%`;
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 8 7 12 13 4" />
    </svg>
  );
}

function IconTicket() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 5a1 1 0 011-1h10a1 1 0 011 1v1.5a1.5 1.5 0 000 3V11a1 1 0 01-1 1H3a1 1 0 01-1-1V9.5a1.5 1.5 0 000-3V5z" />
      <path d="M6 4v8" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

// Rate-setting tier ladder (Starter / Riser / Pro / Elite). Colors match the
// milestone seed so the admin view and the affiliate view show the same
// visual identity per tier. `fallback` is the default for any tier the
// organizer added manually that we don't have a custom palette for.
const TIER_STYLES: Record<string, {
  tileText: string;
  tileBorder: string;
  tileBg: string;
  progress: string;
}> = {
  starter: {
    tileText: "#9CA4B7",
    tileBorder: "rgba(156,164,183,0.6)",
    tileBg: "rgba(156,164,183,0.18)",
    progress: "linear-gradient(90deg, rgb(156,164,183) 0%, rgb(120,128,148) 100%)",
  },
  riser: {
    tileText: "#5B8DEF",
    tileBorder: "rgba(91,141,239,0.6)",
    tileBg: "rgba(91,141,239,0.18)",
    progress: "linear-gradient(90deg, rgb(91,141,239) 0%, rgb(44,84,166) 100%)",
  },
  pro: {
    tileText: "#E19A3E",
    tileBorder: "rgba(225,154,62,0.6)",
    tileBg: "rgba(225,154,62,0.18)",
    progress: "linear-gradient(90deg, rgb(225,154,62) 0%, rgb(184,115,51) 100%)",
  },
  elite: {
    tileText: "#FFD620",
    tileBorder: "rgba(255,214,32,0.6)",
    tileBg: "rgba(255,214,32,0.18)",
    progress: "linear-gradient(90deg, rgb(255,214,32) 0%, rgb(255,165,0) 100%)",
  },
  fallback: {
    tileText: "#E5E7EB",
    tileBorder: "rgba(229,231,235,0.6)",
    tileBg: "rgba(229,231,235,0.18)",
    progress: "linear-gradient(90deg, rgb(229,231,235) 0%, rgb(180,183,192) 100%)",
  },
};

function styleForTier(nameOrKey: string) {
  return TIER_STYLES[nameOrKey.toLowerCase()] ?? TIER_STYLES.fallback;
}

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
          borderColor: tileBorder,
          color: tileText,
          background: `linear-gradient(180deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.02) 100%), ${tileBg}`,
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

// Pill used for the comp-tickets metadata. Kept neutral so the tier color
// in the tile stays the dominant signal and the pill reads as supporting
// info, not a competing badge.
function MetaPill({ label, value }: { label: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-[var(--space-2)] rounded-full border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[12px] leading-[16px] text-[rgba(255,255,255,0.80)]">
      <span className="inline-flex items-center gap-[4px] text-[rgba(255,255,255,0.50)]">{label}</span>
      <span className="font-medium text-[#F0F0F0]">{value}</span>
    </span>
  );
}

function MilestoneCardSkeleton() {
  return (
    <article
      className="rounded-[8px] p-[24px]"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(21,26,43,0.5)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.10), 0 8px 24px rgba(0,0,0,0.18)",
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
  commissionRateBps,
  complimentaryTickets,
}: {
  id: string;
  name: string;
  letter: string;
  targetAmount: number;
  currentAmount: number;
  currency: string;
  description: string;
  unlocked: boolean;
  commissionRateBps: number;
  complimentaryTickets: number;
}) {
  const styles = styleForTier(name);
  // Starter (targetMinor = 0) is always "unlocked" by definition — show it
  // as full progress rather than divide-by-zero gibberish.
  const isEntryTier = targetAmount <= 0;
  const effectiveCurrent = unlocked || isEntryTier ? Math.max(targetAmount, currentAmount) : currentAmount;
  const pct = isEntryTier ? 100 : Math.min(100, (effectiveCurrent / targetAmount) * 100);

  return (
    <article
      className="rounded-[8px] p-[24px]"
      style={{
        background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 100%), rgba(21,26,43,0.5)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.10), 0 8px 24px rgba(0,0,0,0.18)",
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
          {/* Title row — tier name · rate · revenue-to-unlock */}
          <div className="flex items-center gap-[16px]">
            <h2 className="font-[var(--font-display)] text-[20px] font-bold leading-[28px] tracking-[-0.3px] text-[#F0F0F0]">
              {name}
            </h2>
            <span
              className="font-[var(--font-display)] text-[20px] font-bold leading-[28px] tracking-[-0.3px]"
              style={{ color: styles.tileText }}
            >
              {formatRatePct(commissionRateBps)}
            </span>
            <span className="inline-block h-[1px] w-[24px] bg-[rgba(255,255,255,0.42)]" />
            <p className="font-[var(--font-sans)] text-[14px] leading-[20px] text-[rgba(255,255,255,0.70)]">
              {isEntryTier ? "Entry" : formatCurrency(targetAmount, currency)}
            </p>
          </div>

          {/* Description */}
          <p className="mt-[12px] font-[var(--font-sans)] text-[14px] leading-[21px] text-[rgba(255,255,255,0.72)]">
            {description}
          </p>

          {/* Metadata pills — comp tickets. Kept below the description so
              the money fact (rate) stays anchored to the name row. */}
          <div className="mt-[12px] flex flex-wrap items-center gap-[var(--space-2)]">
            <MetaPill
              label={
                <>
                  <IconTicket />
                  <span>Complimentary tickets</span>
                </>
              }
              value={String(complimentaryTickets)}
            />
          </div>

          {/* Progress section */}
          <div className="mt-[16px] flex flex-col gap-[8px]">
            <div className="flex items-center justify-between">
              <p className="font-[var(--font-sans)] text-[12px] leading-[14px] text-[#9CA4B7]">
                {isEntryTier
                  ? "Entry tier — active from your first sale"
                  : `${formatCurrency(effectiveCurrent, currency)} / ${formatCurrency(targetAmount, currency)} (${Math.round(pct)}%)`}
              </p>
              <span className={`font-[var(--font-sans)] text-[12px] font-medium leading-[14px] ${unlocked || isEntryTier ? "text-[#22C55E]" : "text-[#F0F0F0]"}`}>
                {unlocked || isEntryTier ? "Unlocked!" : "Locked"}
              </span>
            </div>

            {/* Progress bar — 8px, colored when unlocked/progressing, grey when locked/0% */}
            <div
              role="progressbar"
              aria-valuenow={Math.round(pct)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${name} milestone progress`}
              className="h-[8px] w-full overflow-hidden rounded-full bg-[rgba(255,255,255,0.10)] p-[1px]"
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
