"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useMilestoneProgress } from "@/modules/milestones/hooks/use-milestone-progress";

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function MilestoneSkeleton() {
  return (
    <section
      aria-label="Milestone progress"
      aria-busy="true"
      aria-live="polite"
      className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]"
    >
      <div className="h-[var(--text-sm)] w-1/2 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      <div className="mt-[var(--space-4)] h-[var(--text-base)] w-1/3 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      <div className="mt-[var(--space-3)] h-[var(--space-2)] w-full animate-pulse rounded-full bg-[var(--color-border)]" />
      <div className="mt-[var(--space-3)] h-[var(--text-xs)] w-2/3 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
    </section>
  );
}

export function MilestoneProgress() {
  const { tenant } = useTenant();
  const { data, isLoading } = useMilestoneProgress(tenant?.id);

  if (isLoading) return <MilestoneSkeleton />;

  const current = data?.currentAmount ?? 0;
  const target = data?.targetAmount ?? 1;
  const currency = data?.currency ?? "USD";
  const tierName = data?.tierName ?? "Gold";

  const pct = Math.min(100, Math.round((current / target) * 100));
  const remaining = target - current;

  return (
    <section
      aria-label="Milestone progress"
      className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]"
    >
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <h2 className="font-[var(--font-display)] text-[2rem] font-bold leading-none tracking-[-0.04em] text-[var(--color-text-primary)]">
          Next Milestone: {tierName}
        </h2>
        <p className="font-[var(--font-sans)] text-[0.92rem] leading-[1.2rem] text-[var(--color-text-secondary)]">
          {formatCurrency(target, currency)} target
        </p>
      </div>

      <div className="mt-[0.95rem] flex items-baseline justify-between">
        <p className="font-[var(--font-sans)] font-semibold text-[0.96rem] leading-[1.25rem] text-[var(--color-text-primary)]">
          {formatCurrency(current, currency)}{" "}
          <span className="font-normal text-[0.96rem] text-[var(--color-text-muted)]">
            / {formatCurrency(target, currency)}
          </span>
        </p>
        <p className="font-[var(--font-sans)] text-[0.92rem] font-semibold leading-[1.2rem] text-[var(--color-text-secondary)]">
          {((current / target) * 100).toFixed(1)}%
        </p>
      </div>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${pct}% toward ${tierName} milestone`}
        style={{ "--progress": `${pct}%` } as React.CSSProperties}
        className="mt-[0.7rem] h-[0.6rem] w-full overflow-hidden rounded-full bg-[var(--color-progress-track)]"
      >
        <div className="progress-fill h-full rounded-full bg-[var(--color-primary)]" />
      </div>

      <p className="mt-[0.7rem] font-[var(--font-sans)] text-[0.9rem] leading-[1.2rem] text-[var(--color-text-secondary)]">
        Only {formatCurrency(remaining, currency)} more to unlock{" "}
        <span className="font-semibold text-[var(--color-text-primary)]">
          {tierName}
        </span>{" "}
        tier benefits!{" "}
        <span aria-hidden="true">🏆</span>
      </p>
    </section>
  );
}
