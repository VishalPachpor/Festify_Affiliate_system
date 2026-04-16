"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useMilestoneProgress } from "@/modules/milestones/hooks/use-milestone-progress";

function formatCurrency(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

// Figma 56:2761 — progress bar gradient
const PROGRESS_GRADIENT =
  "linear-gradient(90deg, rgb(28,74,166) 0%, rgb(36,79,166) 25%, rgb(44,84,166) 50%, rgb(52,89,165) 75%, rgb(59,94,165) 100%)";

function MilestoneSkeleton() {
  return (
    <section
      aria-label="Milestone progress"
      aria-busy="true"
      aria-live="polite"
      className="rounded-[8px] border border-[rgba(255,255,255,0.1)] p-[24px]"
      style={{ background: "rgba(21,26,43,0.5)" }}
    >
      <div className="h-[20px] w-1/2 animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.08)]" />
      <div className="mt-[16px] h-[18px] w-1/3 animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.08)]" />
      <div className="mt-[8px] h-[12px] w-full animate-pulse rounded-full bg-[rgba(255,255,255,0.08)]" />
      <div className="mt-[8px] h-[18px] w-2/3 animate-pulse rounded-[4px] bg-[rgba(255,255,255,0.08)]" />
    </section>
  );
}

export function MilestoneProgress() {
  const { tenant } = useTenant();
  const { data, isLoading } = useMilestoneProgress(tenant?.id);

  if (isLoading) return <MilestoneSkeleton />;
  if (!data?.nextTier) return null;

  const current = data.currentRevenue ?? 0;
  const target = data.nextTierTarget || 1;
  const currency = data.currency ?? "USD";
  const tierName = data.nextTier.charAt(0).toUpperCase() + data.nextTier.slice(1);

  const pct = Math.min(100, Math.round((current / target) * 100));
  const remaining = target - current;

  return (
    <section
      aria-label="Milestone progress"
      className="rounded-[8px] border border-[rgba(255,255,255,0.1)] p-[24px]"
      style={{ background: "rgba(21,26,43,0.5)" }}
    >
      {/* Header — Figma 56:2749 */}
      <div className="flex items-center justify-between gap-[16px]">
        <h2 className="font-[var(--font-display)] text-[18px] font-medium leading-[20px] tracking-[-0.2px] text-[#F0F0F0]">
          Next Milestone: {tierName}
        </h2>
        <p className="font-[var(--font-sans)] text-[12px] leading-[18px] text-[#E5E5E5]">
          {formatCurrency(target, currency)} target
        </p>
      </div>

      {/* Progress info — Figma 56:2754 */}
      <div className="mt-[16px] flex flex-col gap-[8px]">
        <div className="flex items-baseline justify-between">
          <p className="font-[var(--font-sans)] text-[12px] leading-[18px] text-[#E5E5E5]">
            {formatCurrency(current, currency)} / {formatCurrency(target, currency)}
          </p>
          <p className="font-[var(--font-sans)] text-[12px] leading-[18px] text-[#A6D1FF]">
            {((current / target) * 100).toFixed(1)}%
          </p>
        </div>

        {/* Progress bar — Figma 56:2760 */}
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${pct}% toward ${tierName} milestone`}
          className="h-[12px] w-full overflow-hidden rounded-full border border-[rgba(255,255,255,0.1)] bg-[#0D1420]"
        >
          <div
            className="h-full rounded-full transition-[width] duration-500"
            style={{
              width: `${pct}%`,
              backgroundImage: PROGRESS_GRADIENT,
              boxShadow: "0 0 8px rgba(28,74,166,0.4)",
            }}
          />
        </div>

        <div className="flex items-center gap-[8px]">
          <p className="font-[var(--font-sans)] text-[12px] leading-[18px] text-[#E5E5E5]">
            Only {formatCurrency(remaining, currency)} more to unlock{" "}
            <span className="font-medium text-[#F0F0F0]">{tierName}</span>{" "}
            tier benefits!{" "}
            <span aria-hidden="true">🏆</span>
          </p>
        </div>
      </div>
    </section>
  );
}
