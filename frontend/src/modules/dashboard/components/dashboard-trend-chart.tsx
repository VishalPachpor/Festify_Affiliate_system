"use client";

import { useDashboardTrend } from "../hooks/use-dashboard-trend";
import { PanelShell, PanelError, SkeletonLine } from "./panel-shell";

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dateStr));
}

function TrendSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center justify-between">
          <SkeletonLine width="30%" />
          <SkeletonLine width="20%" />
        </div>
      ))}
    </div>
  );
}

export function DashboardTrendChart({
  tenantId,
  campaignId,
}: {
  tenantId: string | undefined;
  campaignId?: string;
}) {
  const { data, isLoading, error } = useDashboardTrend(tenantId, campaignId);

  if (error) {
    return (
      <PanelError
        message={`Failed to load trend data. ${error instanceof Error ? error.message : ""}`}
      />
    );
  }

  return (
    <PanelShell title="Revenue Trend">
      {isLoading || !data ? (
        <TrendSkeleton />
      ) : data.points.length === 0 ? (
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
          No trend data for this period.
        </p>
      ) : (
        <div className="flex flex-col gap-[var(--space-2)]">
          {/* Bar chart — relative bars */}
          {(() => {
            const maxRevenue = Math.max(
              ...data.points.map((p) => p.revenue),
              1,
            );
            return data.points.map((point) => (
              <div key={point.date} className="flex items-center gap-[var(--space-3)]">
                <span className="w-[var(--space-12)] shrink-0 font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                  {formatDate(point.date)}
                </span>
                <div className="flex-1 h-[var(--space-2)] rounded-[var(--radius)] bg-[var(--color-border)] overflow-hidden">
                  <div
                    className="h-full rounded-[var(--radius)] bg-[var(--color-primary)]"
                    style={{
                      width: `${(point.revenue / maxRevenue) * 100}%`,
                    }}
                  />
                </div>
                <span className="w-[var(--space-12)] shrink-0 text-right font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                  {formatCurrency(point.revenue, data.currency)}
                </span>
              </div>
            ));
          })()}
        </div>
      )}
    </PanelShell>
  );
}
