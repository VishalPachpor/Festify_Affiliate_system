"use client";

import { Suspense } from "react";
import { useTenant } from "@/modules/tenant-shell";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { SalesSummaryPanel } from "@/modules/sales/components/sales-summary-panel";
import { SalesTable } from "@/modules/sales/components/sales-table";

function SalesContent() {
  const { tenant } = useTenant();

  return (
    <DashboardContainer>
      <h1 className="font-[var(--font-display)] text-[var(--text-2xl)] leading-[var(--leading-tight)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
        Sales
      </h1>
      <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
        {tenant ? `${tenant.name} — Sales & commissions` : "Select a tenant"}
      </p>

      <div className="mt-[var(--space-6)] flex flex-col gap-[var(--space-5)]">
        <SalesSummaryPanel tenantId={tenant?.id} />
        <SalesTable tenantId={tenant?.id} />
      </div>
    </DashboardContainer>
  );
}

export default function SalesPage() {
  return (
    <Suspense>
      <SalesContent />
    </Suspense>
  );
}
