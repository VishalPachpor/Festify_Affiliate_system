"use client";

import { useSaleDetails } from "../hooks/use-sale-details";
import type { SaleDetail } from "../types";

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateStr));
}

const sourceLabels: Record<SaleDetail["attribution"]["source"], string> = {
  referral_link: "Referral Link",
  referral_code: "Referral Code",
  direct: "Direct",
  organic: "Organic",
  unattributed: "Unattributed",
};

const statusColors: Record<string, string> = {
  pending: "var(--color-warning)",
  confirmed: "var(--color-success)",
  processing: "var(--color-info)",
  paid: "var(--color-success)",
  rejected: "var(--color-error)",
  failed: "var(--color-error)",
};

function TraceStep({
  label,
  detail,
  timestamp,
  color,
  isLast,
}: {
  label: string;
  detail: string;
  timestamp?: string;
  color: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-[var(--space-3)]">
      {/* Timeline line + dot */}
      <div className="flex flex-col items-center">
        <div
          className="h-[var(--space-3)] w-[var(--space-3)] shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        {!isLast && (
          <div className="w-px flex-1 bg-[var(--color-border)]" />
        )}
      </div>

      {/* Content */}
      <div className="pb-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
          {label}
        </p>
        <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
          {detail}
        </p>
        {timestamp && (
          <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
            {formatDate(timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-5)]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex gap-[var(--space-3)]">
          <div className="h-[var(--space-3)] w-[var(--space-3)] shrink-0 animate-pulse rounded-full bg-[var(--color-border)]" />
          <div className="flex-1 flex flex-col gap-[var(--space-1)]">
            <div className="h-[var(--text-sm)] w-[40%] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
            <div className="h-[var(--text-xs)] w-[60%] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AttributionTracePanel({
  tenantId,
  saleId,
  onClose,
}: {
  tenantId: string | undefined;
  saleId: string | undefined;
  onClose?: () => void;
}) {
  const { data, isLoading, error } = useSaleDetails(tenantId, saleId);

  if (!saleId) return null;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <div className="flex items-center justify-between">
        <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
          Attribution Trace
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
            Failed to load attribution data.
          </p>
        ) : isLoading || !data ? (
          <DetailSkeleton />
        ) : (
          <div className="flex flex-col">
            {/* Step 1: Sale */}
            <TraceStep
              label="Sale Recorded"
              detail={`${formatCurrency(data.amount, data.currency)} from ${data.affiliateName}`}
              timestamp={data.createdAt}
              color={statusColors[data.status] ?? "var(--color-text-muted)"}
            />

            {/* Step 2: Attribution */}
            <TraceStep
              label={
                data.attribution.attributed
                  ? `Attributed via ${sourceLabels[data.attribution.source]}`
                  : "Unattributed"
              }
              detail={
                data.attribution.referralCode
                  ? `Code: ${data.attribution.referralCode}`
                  : data.attribution.referralUrl
                    ? `URL: ${data.attribution.referralUrl}`
                    : data.attribution.landingPage
                      ? `Landing: ${data.attribution.landingPage}`
                      : data.attribution.attributed
                        ? "Direct attribution"
                        : "No matching referral data found"
              }
              timestamp={data.attribution.attributedAt ?? undefined}
              color={data.attribution.attributed ? "var(--color-primary)" : "var(--color-warning)"}
            />

            {/* Step 3: Commission */}
            <TraceStep
              label="Commission"
              detail={
                data.commissionBreakdown
                  ? `${data.commissionBreakdown.rate}% of ${formatCurrency(data.commissionBreakdown.baseAmount, data.commissionBreakdown.currency)} = ${formatCurrency(data.commissionBreakdown.commissionAmount, data.commissionBreakdown.currency)}${data.commissionBreakdown.tier ? ` (${data.commissionBreakdown.tier})` : ""}`
                  : "No commission — sale is unattributed"
              }
              color={data.commissionBreakdown ? "var(--color-info)" : "var(--color-text-muted)"}
            />

            {/* Step 4: Payout */}
            <TraceStep
              label={data.payoutId ? "Payout" : "Payout Pending"}
              detail={
                data.payoutStatus
                  ? `Status: ${data.payoutStatus}`
                  : "Awaiting payout processing"
              }
              color={statusColors[data.payoutStatus ?? "pending"] ?? "var(--color-text-muted)"}
              isLast
            />
          </div>
        )}
      </div>
    </div>
  );
}
