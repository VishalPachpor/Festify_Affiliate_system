"use client";

import { useSalesList } from "../hooks/use-sales-list";
import type { SalesFilterState } from "../types";

function formatCurrency(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

const unattributedFilters: SalesFilterState = {
  page: 1,
  pageSize: 10,
  attributed: "false",
  sortBy: "createdAt",
  sortOrder: "desc",
};

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="h-[var(--space-10)] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]"
        />
      ))}
    </div>
  );
}

export function UnattributedSalesPanel({
  tenantId,
  onSelectSale,
}: {
  tenantId: string | undefined;
  onSelectSale?: (saleId: string) => void;
}) {
  const { data, isLoading, error } = useSalesList(
    tenantId,
    unattributedFilters,
  );

  if (error) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
          Failed to load unattributed sales.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <div className="flex items-center justify-between">
        <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
          Unattributed Sales
        </h3>
        {data && (
          <span className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[var(--color-warning)]">
            {data.total} unresolved
          </span>
        )}
      </div>

      <div className="mt-[var(--space-5)]">
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.sales.length === 0 ? (
          <p className="py-[var(--space-4)] text-center font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
            All sales are attributed.
          </p>
        ) : (
          <div className="flex flex-col">
            {data.sales.map((sale, index) => (
              <button
                key={sale.id}
                type="button"
                onClick={() => onSelectSale?.(sale.id)}
                className={`flex items-center justify-between py-[var(--space-3)] text-left transition-colors hover:bg-[var(--color-surface-ghost-hover)] ${
                  index > 0 ? "border-t border-[var(--color-border)]" : ""
                }`}
              >
                <div className="flex flex-col gap-[var(--space-1)]">
                  <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">
                    {formatCurrency(sale.amount, sale.currency)}
                  </span>
                  <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
                    {formatDate(sale.createdAt)}
                  </span>
                </div>
                <span className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[var(--color-warning)]">
                  No attribution
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
