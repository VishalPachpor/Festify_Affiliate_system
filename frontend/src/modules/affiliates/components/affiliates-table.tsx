"use client";

import { useAffiliatesList } from "../hooks/use-affiliates-list";
import { useAffiliatesFilters } from "../hooks/use-affiliates-filters";
import type { AffiliateStatus, AffiliatesFilterState } from "../types";

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
    year: "numeric",
  }).format(new Date(dateStr));
}

const statusStyles: Record<AffiliateStatus, string> = {
  approved: "text-[var(--color-success)]",
  pending: "text-[var(--color-warning)]",
  rejected: "text-[var(--color-error)]",
  mou_pending: "text-[var(--color-warning)]",
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

function StatusFilter({
  value,
  onChange,
}: {
  value: AffiliatesFilterState["status"];
  onChange: (status: AffiliatesFilterState["status"]) => void;
}) {
  const options: { label: string; value: AffiliatesFilterState["status"] }[] = [
    { label: "All", value: undefined },
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Rejected", value: "rejected" },
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

export function AffiliatesTable({
  tenantId,
  campaignId,
  onSelect,
}: {
  tenantId: string | undefined;
  campaignId?: string;
  onSelect?: (affiliateId: string) => void;
}) {
  const { filters, setFilters } = useAffiliatesFilters();
  const { data, isLoading, error } = useAffiliatesList(tenantId, filters, campaignId);

  if (error) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
          Failed to load marketing partners.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <div className="flex items-center justify-between">
        <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
          Marketing Partners
        </h3>
        <StatusFilter
          value={filters.status}
          onChange={(status) => setFilters({ status })}
        />
      </div>

      <div className="mt-[var(--space-5)]">
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.affiliates.length === 0 ? (
          <p className="py-[var(--space-8)] text-center font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
            No marketing partners found.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-[var(--space-4)] pb-[var(--space-3)] border-b border-[var(--color-border)]">
              {["Name", "Revenue", "Commission", "Status", "Joined"].map((h) => (
                <span
                  key={h}
                  className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]"
                >
                  {h}
                </span>
              ))}
            </div>

            {data.affiliates.map((affiliate) => (
              <button
                key={affiliate.id}
                type="button"
                onClick={() => onSelect?.(affiliate.id)}
                className="grid w-full grid-cols-[1fr_1fr_1fr_auto_auto] gap-[var(--space-4)] py-[var(--space-3)] border-b border-[var(--color-border)] last:border-b-0 text-left transition-colors hover:bg-[var(--color-surface-ghost-hover)]"
              >
                <div className="min-w-0">
                  <span className="block font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] truncate">
                    {affiliate.name}
                  </span>
                  <span className="block font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-muted)] truncate">
                    {affiliate.email}
                  </span>
                </div>
                <span className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] self-center">
                  {formatCurrency(affiliate.totalRevenue, affiliate.currency)}
                </span>
                <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)] self-center">
                  {formatCurrency(affiliate.totalCommission, affiliate.currency)}
                </span>
                <span
                  className={`font-[var(--font-sans)] text-[var(--text-xs)] font-medium capitalize self-center ${statusStyles[affiliate.status]}`}
                >
                  {affiliate.status}
                </span>
                <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-muted)] self-center">
                  {formatDate(affiliate.joinedAt)}
                </span>
              </button>
            ))}

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
