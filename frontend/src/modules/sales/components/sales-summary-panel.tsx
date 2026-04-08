"use client";

import { useSalesSummary } from "../hooks/use-sales-summary";

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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

export function SalesSummaryPanel({
  tenantId,
  campaignId,
}: {
  tenantId: string | undefined;
  campaignId?: string;
}) {
  const { data, isLoading, error } = useSalesSummary(tenantId, campaignId);

  if (error) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
          Failed to load sales summary.
        </p>
      </div>
    );
  }

  const currency = data?.currency ?? "USD";

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
        Sales Overview
      </h3>
      <div className="mt-[var(--space-5)] grid grid-cols-2 gap-[var(--space-5)] md:grid-cols-4">
        <Stat
          label="Total Sales"
          value={String(data?.totalSales ?? 0)}
          loading={isLoading}
        />
        <Stat
          label="Revenue"
          value={formatCurrency(data?.totalRevenue ?? 0, currency)}
          loading={isLoading}
        />
        <Stat
          label="Commissions"
          value={formatCurrency(data?.totalCommissions ?? 0, currency)}
          loading={isLoading}
        />
        <Stat
          label="Pending"
          value={String(data?.pendingCount ?? 0)}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
