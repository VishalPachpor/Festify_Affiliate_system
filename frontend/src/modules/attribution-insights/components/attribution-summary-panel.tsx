"use client";

import { useAttributionSummary } from "../hooks/use-attribution-summary";

function Stat({
  label,
  value,
  color,
  loading,
}: {
  label: string;
  value: string;
  color?: string;
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
        <span
          className="font-[var(--font-sans)] text-[var(--text-xl)] leading-[var(--leading-tight)] font-semibold"
          style={{ color: color ?? "var(--color-text-primary)" }}
        >
          {value}
        </span>
      )}
    </div>
  );
}

export function AttributionSummaryPanel({
  tenantId,
}: {
  tenantId: string | undefined;
}) {
  const { data, isLoading, error } = useAttributionSummary(tenantId);

  if (error) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
          Failed to load attribution summary.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
        Attribution Performance
      </h3>
      <div className="mt-[var(--space-5)] grid grid-cols-2 gap-[var(--space-5)] md:grid-cols-4">
        <Stat
          label="Total Sales"
          value={String(data?.totalSales ?? 0)}
          loading={isLoading}
        />
        <Stat
          label="Success Rate"
          value={`${(data?.successRate ?? 0).toFixed(1)}%`}
          color="var(--color-success)"
          loading={isLoading}
        />
        <Stat
          label="Attributed"
          value={String(data?.attributedCount ?? 0)}
          loading={isLoading}
        />
        <Stat
          label="Unattributed"
          value={String(data?.unattributedCount ?? 0)}
          color={
            (data?.unattributedCount ?? 0) > 0
              ? "var(--color-warning)"
              : "var(--color-text-primary)"
          }
          loading={isLoading}
        />
      </div>
    </div>
  );
}
