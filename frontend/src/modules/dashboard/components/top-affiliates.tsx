"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useTopAffiliates } from "../hooks/use-top-affiliates";
import type { TopAffiliate } from "../types";

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function SkeletonRow() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center gap-[var(--space-3)] py-[var(--space-3)]"
    >
      <div className="h-[var(--text-xs)] w-[var(--col-rank)] shrink-0 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      <div className="h-[var(--text-sm)] flex-1 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      <div className="h-[var(--text-xs)] w-[var(--col-sales)] shrink-0 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      <div className="h-[var(--text-sm)] w-[var(--col-revenue)] shrink-0 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
    </div>
  );
}

function AffiliateRow({
  rank,
  affiliate,
  currency,
}: {
  rank: number;
  affiliate: TopAffiliate;
  currency: string;
}) {
  return (
    <div className="flex items-center gap-[var(--space-3)] py-[var(--space-3)]">
      <span className="w-[var(--col-rank)] shrink-0 text-right font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] text-[var(--color-text-muted)]">
        {rank}
      </span>

      <span className="flex-1 truncate font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--leading-snug)] text-[var(--color-text-primary)]">
        {affiliate.name}
      </span>

      <span className="w-[var(--col-sales)] shrink-0 font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] text-[var(--color-text-muted)]">
        {affiliate.totalSales} sales
      </span>

      <span className="w-[var(--col-revenue)] shrink-0 text-right font-[var(--font-sans)] font-semibold text-[var(--text-sm)] leading-[var(--leading-snug)] text-[var(--color-text-primary)]">
        {formatCurrency(affiliate.totalRevenue, currency)}
      </span>
    </div>
  );
}

export function TopAffiliates() {
  const { tenant } = useTenant();
  const { data, isLoading } = useTopAffiliates(tenant?.id, 5);
  const currency = data?.currency ?? "USD";
  const affiliates = data?.affiliates ?? [];

  return (
    <section
      aria-label="Top affiliates"
      aria-busy={isLoading}
      className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]"
    >
      <h2 className="font-[var(--font-display)] font-bold text-[var(--text-lg)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
        Top Affiliates
      </h2>

      <div className="mt-[var(--space-3)] flex items-center gap-[var(--space-3)] border-b border-[var(--color-border)] pb-[var(--space-3)]">
        <span className="w-[var(--col-rank)] shrink-0" />
        <span className="flex-1 font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[var(--tracking-caption)] text-[var(--color-text-muted)]">
          Name
        </span>
        <span className="w-[var(--col-sales)] shrink-0 font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[var(--tracking-caption)] text-[var(--color-text-muted)]">
          Sales
        </span>
        <span className="w-[var(--col-revenue)] shrink-0 text-right font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[var(--tracking-caption)] text-[var(--color-text-muted)]">
          Revenue
        </span>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
        ) : affiliates.length === 0 ? (
          <p className="py-[var(--space-5)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
            No affiliates yet.
          </p>
        ) : (
          affiliates.map((affiliate, i) => (
            <AffiliateRow
              key={affiliate.id}
              rank={i + 1}
              affiliate={affiliate}
              currency={currency}
            />
          ))
        )}
      </div>
    </section>
  );
}
