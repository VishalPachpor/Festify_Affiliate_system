"use client";

import { useEffect, useState } from "react";
import {
  useConnectionStore,
  getFreshness,
  type FreshnessStatus,
} from "../connection-store";

const freshnessConfig: Record<
  FreshnessStatus,
  { label: string; color: string }
> = {
  live: { label: "Live", color: "var(--color-success)" },
  recent: { label: "Updated recently", color: "var(--color-info)" },
  stale: { label: "Delayed", color: "var(--color-warning)" },
  offline: { label: "Offline", color: "var(--color-text-muted)" },
};

function formatTimeAgo(ts: number | null): string {
  if (!ts) return "";
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

/**
 * Shows realtime connection freshness:
 * - Green dot + "Live"
 * - Blue dot + "Updated 2m ago"
 * - Yellow dot + "Delayed"
 * - Gray dot + "Offline"
 *
 * Re-renders every 10s to update relative time.
 */
export function FreshnessIndicator() {
  const status = useConnectionStore((s) => s.status);
  const lastEventAt = useConnectionStore((s) => s.lastEventAt);

  // Tick every 10s to refresh relative time and freshness status
  const [, setTick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 10_000);
    return () => clearInterval(interval);
  }, []);

  const freshness = getFreshness(status, lastEventAt);
  const config = freshnessConfig[freshness];
  const timeAgo = formatTimeAgo(lastEventAt);

  return (
    <div className="flex items-center gap-[var(--space-2)]">
      <div
        className="h-[var(--space-2)] w-[var(--space-2)] shrink-0 rounded-full"
        style={{ backgroundColor: config.color }}
      />
      <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[var(--color-text-secondary)]">
        {config.label}
        {freshness === "recent" && timeAgo ? ` · ${timeAgo}` : ""}
      </span>
    </div>
  );
}
