"use client";

import { useTopAffiliates } from "../hooks/use-top-affiliates";
import { PanelShell, PanelError, SkeletonLine } from "./panel-shell";

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function AffiliatesSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="flex flex-col gap-[var(--space-1)]">
            <SkeletonLine width="60%" />
            <SkeletonLine width="40%" />
          </div>
          <SkeletonLine width="20%" />
        </div>
      ))}
    </div>
  );
}

export function TopAffiliatesList({
  tenantId,
  limit = 5,
}: {
  tenantId: string | undefined;
  limit?: number;
}) {
  const { data, isLoading, error } = useTopAffiliates(tenantId, limit);

  if (error) {
    return (
      <PanelError
        message={`Failed to load affiliates. ${error instanceof Error ? error.message : ""}`}
      />
    );
  }

  return (
    <PanelShell title="Top Affiliates">
      {isLoading || !data ? (
        <AffiliatesSkeleton />
      ) : data.affiliates.length === 0 ? (
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
          No affiliates yet.
        </p>
      ) : (
        <div className="flex flex-col">
          {data.affiliates.map((affiliate, index) => (
            <div
              key={affiliate.id}
              className={`flex items-center justify-between py-[var(--space-3)] ${
                index > 0
                  ? "border-t border-[var(--color-border)]"
                  : ""
              }`}
            >
              <div className="flex flex-col gap-[var(--space-1)]">
                <span className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                  {affiliate.name}
                </span>
                <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                  {affiliate.totalSales} sales
                </span>
              </div>
              <span className="font-[var(--font-sans)] text-[var(--text-sm)] font-semibold text-[var(--color-text-primary)]">
                {formatCurrency(affiliate.totalRevenue, data.currency)}
              </span>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
