"use client";

import { useAttributionTrends } from "../hooks/use-attribution-trends";

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
        <div key={i} className="h-[var(--space-6)] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      ))}
    </div>
  );
}

export function AttributionTrendChart({
  tenantId,
}: {
  tenantId: string | undefined;
}) {
  const { data, isLoading, error } = useAttributionTrends(tenantId);

  if (error) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
          Failed to load attribution trends.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
        Attribution Trend
      </h3>

      <div className="mt-[var(--space-5)]">
        {isLoading || !data ? (
          <TrendSkeleton />
        ) : data.points.length === 0 ? (
          <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
            No trend data yet.
          </p>
        ) : (
          <div className="flex flex-col gap-[var(--space-2)]">
            {(() => {
              const maxTotal = Math.max(
                ...data.points.map((p) => p.attributed + p.unattributed),
                1,
              );
              return data.points.map((point) => {
                const total = point.attributed + point.unattributed;
                const attrWidth = (point.attributed / maxTotal) * 100;
                const unattrWidth = (point.unattributed / maxTotal) * 100;
                return (
                  <div key={point.date} className="flex items-center gap-[var(--space-3)]">
                    <span className="w-[var(--space-12)] shrink-0 font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                      {formatDate(point.date)}
                    </span>
                    <div className="flex-1 flex h-[var(--space-2)] rounded-[var(--radius)] bg-[var(--color-border)] overflow-hidden">
                      <div
                        className="h-full bg-[var(--color-success)]"
                        style={{ width: `${attrWidth}%` }}
                      />
                      {unattrWidth > 0 && (
                        <div
                          className="h-full bg-[var(--color-warning)]"
                          style={{ width: `${unattrWidth}%` }}
                        />
                      )}
                    </div>
                    <div className="flex items-center gap-[var(--space-2)] shrink-0">
                      <span className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[var(--color-text-primary)]">
                        {total}
                      </span>
                      <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
                        {point.successRate.toFixed(0)}%
                      </span>
                    </div>
                  </div>
                );
              });
            })()}

            {/* Legend */}
            <div className="mt-[var(--space-3)] flex items-center gap-[var(--space-4)]">
              <div className="flex items-center gap-[var(--space-1)]">
                <div className="h-[var(--space-2)] w-[var(--space-2)] rounded-full bg-[var(--color-success)]" />
                <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                  Attributed
                </span>
              </div>
              <div className="flex items-center gap-[var(--space-1)]">
                <div className="h-[var(--space-2)] w-[var(--space-2)] rounded-full bg-[var(--color-warning)]" />
                <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                  Unattributed
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
