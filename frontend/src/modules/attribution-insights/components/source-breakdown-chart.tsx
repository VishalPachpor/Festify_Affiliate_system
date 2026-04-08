"use client";

import { useSourceBreakdown } from "../hooks/use-source-breakdown";

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

const sourceLabels: Record<string, string> = {
  referral_link: "Referral Link",
  referral_code: "Referral Code",
  direct: "Direct",
  organic: "Organic",
  unattributed: "Unattributed",
};

function BarSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[var(--space-8)] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      ))}
    </div>
  );
}

export function SourceBreakdownChart({
  tenantId,
}: {
  tenantId: string | undefined;
}) {
  const { data, isLoading, error } = useSourceBreakdown(tenantId);

  if (error) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
          Failed to load source breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
        By Source
      </h3>

      <div className="mt-[var(--space-5)]">
        {isLoading || !data ? (
          <BarSkeleton />
        ) : data.items.length === 0 ? (
          <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
            No attribution data yet.
          </p>
        ) : (
          <div className="flex flex-col gap-[var(--space-4)]">
            {data.items.map((item) => (
              <div key={item.source} className="flex flex-col gap-[var(--space-2)]">
                <div className="flex items-center justify-between">
                  <span className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                    {sourceLabels[item.source] ?? item.source}
                  </span>
                  <div className="flex items-center gap-[var(--space-3)]">
                    <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                      {item.count} sales
                    </span>
                    <span className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                      {formatCurrency(item.revenue, item.currency)}
                    </span>
                  </div>
                </div>
                <div className="h-[var(--space-2)] rounded-[var(--radius)] bg-[var(--color-border)] overflow-hidden">
                  <div
                    className="h-full rounded-[var(--radius)] bg-[var(--color-primary)]"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
