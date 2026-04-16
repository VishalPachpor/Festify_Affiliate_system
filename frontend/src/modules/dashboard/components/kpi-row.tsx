"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useDashboardSummary } from "../hooks/use-dashboard-summary";
import { KpiCard } from "./kpi-card";

function formatCurrency(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

export function KpiRow() {
  const { tenant } = useTenant();
  const { data, isLoading } = useDashboardSummary(tenant?.id);
  const currency = data?.currency ?? "USD";

  return (
    <div className="grid grid-cols-2 gap-[24px] lg:grid-cols-4">
      <KpiCard
        label="Total Sales"
        value={formatCurrency(data?.totalRevenue ?? 0, currency)}
        changeLabel={
          data?.revenueChangePct !== undefined
            ? `+${Number.isInteger(data.revenueChangePct) ? data.revenueChangePct : data.revenueChangePct.toFixed(1)}%`
            : undefined
        }
        accentColor="#D9D9D9"
        isLoading={isLoading}
      />
      <KpiCard
        label="Commission Earned"
        value={formatCurrency(data?.totalCommissions ?? 0, currency)}
        changeLabel={
          data?.commissionsChangePct !== undefined
            ? `+${Number.isInteger(data.commissionsChangePct) ? data.commissionsChangePct : data.commissionsChangePct.toFixed(1)}`
            : undefined
        }
        accentColor="#1C4AA6"
        isLoading={isLoading}
      />
      <KpiCard
        label="Paid Out"
        value={formatCurrency(data?.paidOut ?? 0, currency)}
        accentColor="#22C55E"
        isLoading={isLoading}
      />
      <KpiCard
        label="Milestones Unlocked"
        value={`${data?.milestonesUnlocked ?? 0}/4`}
        accentColor="#C9A84C"
        isLoading={isLoading}
      />
    </div>
  );
}
