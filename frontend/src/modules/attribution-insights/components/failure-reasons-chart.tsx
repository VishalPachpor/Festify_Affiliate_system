"use client";

import { useFailureReasons } from "../hooks/use-failure-reasons";

function BarSkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-3)]">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[var(--space-6)] animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      ))}
    </div>
  );
}

export function FailureReasonsChart({
  tenantId,
}: {
  tenantId: string | undefined;
}) {
  const { data, isLoading, error } = useFailureReasons(tenantId);

  if (error) {
    return (
      <div className="rounded-[var(--radius)] border border-[var(--color-error)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-error)]">
          Failed to load failure reasons.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]">
      <div className="flex items-center justify-between">
        <h3 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
          Failure Reasons
        </h3>
        {data && (
          <span className="font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[var(--color-warning)]">
            {data.totalFailures} total
          </span>
        )}
      </div>

      <div className="mt-[var(--space-5)]">
        {isLoading || !data ? (
          <BarSkeleton />
        ) : data.items.length === 0 ? (
          <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-success)]">
            No attribution failures.
          </p>
        ) : (
          <div className="flex flex-col">
            {data.items.map((item, index) => (
              <div
                key={item.reason}
                className={`flex items-center justify-between py-[var(--space-3)] ${
                  index > 0 ? "border-t border-[var(--color-border)]" : ""
                }`}
              >
                <div className="flex-1 min-w-0">
                  <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">
                    {item.reason}
                  </span>
                </div>
                <div className="flex items-center gap-[var(--space-3)] shrink-0">
                  <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
                    {item.percentage.toFixed(1)}%
                  </span>
                  <span className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-error)]">
                    {item.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
