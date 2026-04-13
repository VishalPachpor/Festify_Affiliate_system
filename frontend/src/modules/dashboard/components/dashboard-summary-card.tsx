"use client";

import { useDashboardSummary } from "../hooks/use-dashboard-summary";

function formatCurrency(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function StatItem({
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

export function DashboardSummaryCard({
  tenantId,
  campaignId,
}: {
  tenantId: string | undefined;
  campaignId?: string;
}) {
  const { data, isLoading, error } = useDashboardSummary(
    tenantId,
    campaignId,
  );

  if (error) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
          Failed to load dashboard data.{" "}
          {error instanceof Error ? error.message : "Unknown error"}
        </p>
      </div>
    );
  }

  if (!tenantId) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          No tenant selected.
        </p>
      </div>
    );
  }

  const currency = data?.currency ?? "USD";

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
        Overview
      </h3>

      <div className="mt-[var(--space-5)] grid grid-cols-2 gap-[var(--space-5)]">
        <StatItem
          label="Total Revenue"
          value={formatCurrency(data?.totalRevenue ?? 0, currency)}
          loading={isLoading}
        />
        <StatItem
          label="Commissions"
          value={formatCurrency(data?.totalCommissions ?? 0, currency)}
          loading={isLoading}
        />
        <StatItem
          label="Affiliates"
          value={String(data?.totalAffiliates ?? 0)}
          loading={isLoading}
        />
        <StatItem
          label="Conversion Rate"
          value={formatPercent(data?.conversionRate ?? 0)}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
