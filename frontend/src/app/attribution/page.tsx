"use client";

import { useTenant } from "@/modules/tenant-shell";
import { FreshnessIndicator } from "@/modules/realtime";
import {
  DashboardContainer,
  DashboardGrid,
} from "@/modules/dashboard/components/dashboard-layout";
import { AttributionSummaryPanel } from "@/modules/attribution-insights/components/attribution-summary-panel";
import { SourceBreakdownChart } from "@/modules/attribution-insights/components/source-breakdown-chart";
import { FailureReasonsChart } from "@/modules/attribution-insights/components/failure-reasons-chart";
import { AttributionTrendChart } from "@/modules/attribution-insights/components/attribution-trend-chart";
import { UnattributedSalesPanel } from "@/modules/sales/components/unattributed-sales-panel";

export default function AttributionPage() {
  const { tenant } = useTenant();

  return (
    <DashboardContainer>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-[var(--font-display)] text-[var(--text-2xl)] leading-[var(--leading-tight)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
            Attribution Insights
          </h1>
          <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
            {tenant ? `${tenant.name} — Attribution performance` : "Select a tenant"}
          </p>
        </div>
        <FreshnessIndicator />
      </div>

      <div className="mt-[var(--space-6)]">
        <DashboardGrid>
          {/* Summary — full width */}
          <div className="col-span-full">
            <AttributionSummaryPanel tenantId={tenant?.id} />
          </div>

          {/* Trend — full width */}
          <div className="col-span-full">
            <AttributionTrendChart tenantId={tenant?.id} />
          </div>

          {/* Side by side */}
          <SourceBreakdownChart tenantId={tenant?.id} />
          <FailureReasonsChart tenantId={tenant?.id} />

          {/* Unattributed — full width */}
          <div className="col-span-full">
            <UnattributedSalesPanel tenantId={tenant?.id} />
          </div>
        </DashboardGrid>
      </div>
    </DashboardContainer>
  );
}
