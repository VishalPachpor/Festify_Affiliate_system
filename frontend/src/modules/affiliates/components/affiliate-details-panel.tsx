"use client";

import { useAffiliateDetails } from "../hooks/use-affiliate-details";
import type { AffiliateStatus } from "../types";

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
    month: "long",
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

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-[var(--space-3)] border-b border-[var(--color-border)] last:border-b-0">
      <span className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium uppercase tracking-[var(--tracking-label)] text-[var(--color-text-secondary)]">
        {label}
      </span>
      <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">
        {children}
      </span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <div className="h-[var(--text-xs)] w-[30%] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
          <div className="h-[var(--text-sm)] w-[20%] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
        </div>
      ))}
    </div>
  );
}

export function AffiliateDetailsPanel({
  tenantId,
  affiliateId,
  onClose,
}: {
  tenantId: string | undefined;
  affiliateId: string | undefined;
  onClose?: () => void;
}) {
  const { data, isLoading, error } = useAffiliateDetails(tenantId, affiliateId);

  if (!affiliateId) return null;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <div className="flex items-center justify-between">
        <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
          Marketing Partner Details
        </h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-link)] underline transition-colors hover:text-[var(--color-text-link-hover)]"
          >
            Close
          </button>
        )}
      </div>

      <div className="mt-[var(--space-5)]">
        {error ? (
          <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
            Failed to load marketing partner details.
          </p>
        ) : isLoading || !data ? (
          <DetailSkeleton />
        ) : (
          <div className="flex flex-col">
            <DetailRow label="Name">{data.name}</DetailRow>
            <DetailRow label="Email">{data.email}</DetailRow>
            <DetailRow label="Status">
              <span className={`font-medium capitalize ${statusStyles[data.status]}`}>
                {data.status}
              </span>
            </DetailRow>
            <DetailRow label="Referral Code">
              <code className="font-[var(--font-mono)] text-[var(--text-xs)] bg-[var(--color-input)] px-[var(--space-2)] py-[var(--space-1)] rounded-[var(--radius)]">
                {data.referralCode}
              </code>
            </DetailRow>
            <DetailRow label="Revenue">
              {formatCurrency(data.totalRevenue, data.currency)}
            </DetailRow>
            <DetailRow label="Commission">
              {formatCurrency(data.totalCommission, data.currency)}
            </DetailRow>
            <DetailRow label="Sales">{data.totalSales}</DetailRow>
            <DetailRow label="Conversion">{data.conversionRate.toFixed(1)}%</DetailRow>
            <DetailRow label="Joined">{formatDate(data.joinedAt)}</DetailRow>
            <DetailRow label="Last Sale">
              {data.lastSaleAt ? formatDate(data.lastSaleAt) : "No sales yet"}
            </DetailRow>
          </div>
        )}
      </div>
    </div>
  );
}
