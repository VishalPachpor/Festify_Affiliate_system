"use client";

import { useRecentActivity } from "../hooks/use-recent-activity";
import { PanelShell, PanelError, SkeletonLine } from "./panel-shell";
import type { ActivityItem } from "../types";

const typeLabels: Record<ActivityItem["type"], string> = {
  sale: "Sale",
  signup: "Sign Up",
  payout: "Payout",
  milestone: "Milestone",
};

const typeColors: Record<ActivityItem["type"], string> = {
  sale: "var(--color-success)",
  signup: "var(--color-primary)",
  payout: "var(--color-warning)",
  milestone: "var(--color-info)",
};

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function ActivitySkeleton() {
  return (
    <div className="flex flex-col gap-[var(--space-4)]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-start gap-[var(--space-3)]">
          <div className="mt-[var(--space-1)] h-[var(--space-2)] w-[var(--space-2)] shrink-0 animate-pulse rounded-full bg-[var(--color-border)]" />
          <div className="flex-1 flex flex-col gap-[var(--space-1)]">
            <SkeletonLine width="80%" />
            <SkeletonLine width="30%" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityFeed({
  tenantId,
}: {
  tenantId: string | undefined;
}) {
  const { data, isLoading, error } = useRecentActivity(tenantId);

  if (error) {
    return (
      <PanelError
        message={`Failed to load activity. ${error instanceof Error ? error.message : ""}`}
      />
    );
  }

  return (
    <PanelShell title="Recent Activity">
      {isLoading || !data ? (
        <ActivitySkeleton />
      ) : data.items.length === 0 ? (
        <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
          No recent activity.
        </p>
      ) : (
        <div className="flex flex-col gap-[var(--space-4)]">
          {data.items.map((item) => (
            <div key={item.id} className="flex items-start gap-[var(--space-3)]">
              <div
                className="mt-[var(--space-1)] h-[var(--space-2)] w-[var(--space-2)] shrink-0 rounded-full"
                style={{ backgroundColor: typeColors[item.type] }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">
                  <span className="font-medium">{item.affiliateName}</span>
                  {" — "}
                  {item.description}
                </p>
                <div className="mt-[var(--space-1)] flex items-center gap-[var(--space-2)]">
                  <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
                    {typeLabels[item.type]}
                  </span>
                  <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-muted)]">
                    {formatTimeAgo(item.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PanelShell>
  );
}
