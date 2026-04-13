"use client";

import { usePayoutSummary } from "../hooks/use-payout-summary";

function formatCurrency(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

function Stat({
  label,
  value,
  loading,
}: {
  label: string;
  value: string;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-col gap-[var(--space-1)]">
      <span className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
        {label}
      </span>
      {loading ? (
        <div className="h-[var(--text-xl)] w-[var(--space-12)] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      ) : (
        <span className="font-[var(--font-sans)] text-[var(--text-xl)] leading-[var(--leading-tight)] font-semibold text-[var(--color-text-primary)]">
          {value}
        </span>
      )}
    </div>
  );
}

export function PayoutSummaryPanel({
  tenantId,
}: {
  tenantId: string | undefined;
}) {
  const { data, isLoading, error } = usePayoutSummary(tenantId);

  if (error) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
          Failed to load payout summary.
        </p>
      </div>
    );
  }

  const currency = data?.currency ?? "USD";

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
        Payout Overview
      </h3>
      <div className="mt-[var(--space-5)] grid grid-cols-2 gap-[var(--space-5)] md:grid-cols-4">
        <Stat
          label="Total Paid"
          value={formatCurrency(data?.totalPaid ?? 0, currency)}
          loading={isLoading}
        />
        <Stat
          label="Pending"
          value={formatCurrency(data?.totalPending ?? 0, currency)}
          loading={isLoading}
        />
        <Stat
          label="Processing"
          value={formatCurrency(data?.totalProcessing ?? 0, currency)}
          loading={isLoading}
        />
        <Stat
          label="Failed"
          value={formatCurrency(data?.totalFailed ?? 0, currency)}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
