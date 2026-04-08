"use client";

import { useSalesList } from "../hooks/use-sales-list";
import { useSalesFilters } from "../hooks/use-sales-filters";
import type { Sale, SalesFilterState } from "../types";

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

const statusStyles: Record<Sale["status"], string> = {
  confirmed: "text-[var(--color-success)]",
  pending: "text-[var(--color-warning)]",
  rejected: "text-[var(--color-error)]",
  paid: "text-[var(--color-info)]",
};

function TableSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-[var(--space-10)] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]"
        />
      ))}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-[var(--space-2)]">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="rounded-[var(--radius)] border border-[var(--color-border)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-ghost-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="rounded-[var(--radius)] border border-[var(--color-border)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-ghost-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function StatusFilter({
  value,
  onChange,
}: {
  value: SalesFilterState["status"];
  onChange: (status: SalesFilterState["status"]) => void;
}) {
  const options: { label: string; value: SalesFilterState["status"] }[] = [
    { label: "All", value: undefined },
    { label: "Pending", value: "pending" },
    { label: "Confirmed", value: "confirmed" },
    { label: "Rejected", value: "rejected" },
    { label: "Paid", value: "paid" },
  ];

  return (
    <div className="flex gap-[var(--space-1)]">
      {options.map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-[var(--radius)] px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] transition-colors ${
            value === opt.value
              ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
              : "bg-transparent border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function SalesTable({
  tenantId,
  campaignId,
}: {
  tenantId: string | undefined;
  campaignId?: string;
}) {
  const { filters, setFilters } = useSalesFilters();
  const { data, isLoading, error } = useSalesList(tenantId, filters, campaignId);

  if (error) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
          Failed to load sales data.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <div className="flex items-center justify-between">
        <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
          Sales
        </h3>
        <StatusFilter
          value={filters.status}
          onChange={(status) => setFilters({ status })}
        />
      </div>

      <div className="mt-[var(--space-5)]">
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.sales.length === 0 ? (
          <p className="py-[var(--space-8)] text-center font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
            No sales found.
          </p>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-[var(--space-4)] pb-[var(--space-3)] border-b border-[var(--color-border)]">
              {["Affiliate", "Amount", "Commission", "Status", "Date"].map(
                (h) => (
                  <span
                    key={h}
                    className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]"
                  >
                    {h}
                  </span>
                ),
              )}
            </div>

            {/* Rows */}
            {data.sales.map((sale) => (
              <div
                key={sale.id}
                className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-[var(--space-4)] py-[var(--space-3)] border-b border-[var(--color-border)] last:border-b-0"
              >
                <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] truncate">
                  {sale.affiliateName}
                </span>
                <span className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                  {formatCurrency(sale.amount, sale.currency)}
                </span>
                <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
                  {formatCurrency(sale.commission, sale.currency)}
                </span>
                <span
                  className={`font-[var(--font-sans)] text-[var(--text-xs)] font-medium capitalize ${statusStyles[sale.status]}`}
                >
                  {sale.status}
                </span>
                <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
                  {formatDate(sale.createdAt)}
                </span>
              </div>
            ))}

            {/* Pagination */}
            <div className="mt-[var(--space-4)]">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                onPageChange={(page) => setFilters({ page })}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
