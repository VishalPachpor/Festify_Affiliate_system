"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useDashboardSummary } from "../hooks/use-dashboard-summary";
import { KpiCard } from "./kpi-card";

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCompactDelta(value: number | undefined, withPercent = true) {
  if (value === undefined) return undefined;

  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return withPercent ? `↗ +${rounded}%` : `↗ +${rounded}`;
}

export function KpiRow() {
  const { tenant } = useTenant();
  const { data, isLoading } = useDashboardSummary(tenant?.id);
  const currency = data?.currency ?? "USD";

  return (
    <div className="grid grid-cols-2 gap-[var(--space-4)] lg:grid-cols-4">
      <KpiCard
        label="Total Sales"
        value={formatCurrency(data?.totalRevenue ?? 0, currency)}
        changeLabel={formatCompactDelta(data?.revenueChangePct)}
        accentClassName="bg-[rgba(255,255,255,0.78)]"
        isLoading={isLoading}
      />
      <KpiCard
        label="Commission Earned"
        value={formatCurrency(data?.totalCommissions ?? 0, currency)}
        changeLabel={formatCompactDelta(data?.commissionsChangePct, false)}
        accentClassName="bg-[var(--color-primary)]"
        isLoading={isLoading}
      />
      <KpiCard
        label="Paid Out"
        value={formatCurrency(data?.paidOut ?? 0, currency)}
        accentClassName="bg-[var(--color-success)]"
        isLoading={isLoading}
      />
      <KpiCard
        label="Milestones Unlocked"
        value={`${data?.milestonesUnlocked ?? 0}/4`}
        accentClassName="bg-[var(--color-warning)]"
        isLoading={isLoading}
      />
    </div>
  );
}
