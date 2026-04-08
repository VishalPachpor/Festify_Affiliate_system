"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useRecentActivity } from "../hooks/use-recent-activity";
import type { ActivityItem } from "../types";

const DOT_CLASS: Record<ActivityItem["type"], string> = {
  sale:      "bg-[var(--color-success)]",
  signup:    "bg-[var(--color-info)]",
  payout:    "bg-[var(--color-warning)]",
  milestone: "bg-[var(--color-text-link)]",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function SkeletonItem() {
  return (
    <div
      aria-hidden="true"
      className="flex items-start gap-[var(--space-3)] py-[var(--space-3)]"
    >
      <div className="mt-[var(--offset-dot)] size-[var(--size-dot)] shrink-0 animate-pulse rounded-full bg-[var(--color-border)]" />
      <div className="h-[var(--text-sm)] flex-1 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      <div className="h-[var(--text-xs)] w-[var(--col-timestamp)] shrink-0 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
    </div>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  return (
    <div className="flex items-start gap-[var(--space-3)] py-[var(--space-3)]">
      <span
        aria-hidden="true"
        className={`mt-[var(--offset-dot)] size-[var(--size-dot)] shrink-0 rounded-full ${DOT_CLASS[item.type]}`}
      />

      <p className="flex-1 font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--leading-snug)] text-[var(--color-text-secondary)]">
        <span className="font-medium text-[var(--color-text-primary)]">
          {item.affiliateName}
        </span>
        {" — "}
        {item.description}
      </p>

      <time
        dateTime={item.timestamp}
        className="w-[var(--col-timestamp)] shrink-0 text-right font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] text-[var(--color-text-muted)]"
      >
        {timeAgo(item.timestamp)}
      </time>
    </div>
  );
}

export function RecentActivity() {
  const { tenant } = useTenant();
  const { data, isLoading } = useRecentActivity(tenant?.id);
  const items = (data?.items ?? []).slice(0, 5);

  return (
    <section
      aria-label="Recent activity"
      aria-busy={isLoading}
      className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-6)] py-[var(--space-5)]"
    >
      <h2 className="font-[var(--font-display)] font-bold text-[var(--text-lg)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
        Recent Activity
      </h2>

      <div className="mt-[var(--space-3)] divide-y divide-[var(--color-border)]">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonItem key={i} />)
        ) : items.length === 0 ? (
          <p className="py-[var(--space-5)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
            No recent activity.
          </p>
        ) : (
          items.map((item) => <ActivityRow key={item.id} item={item} />)
        )}
      </div>
    </section>
  );
}
