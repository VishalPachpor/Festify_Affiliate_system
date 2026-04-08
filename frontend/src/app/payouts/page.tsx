"use client";

import { Suspense } from "react";
import { useTenant } from "@/modules/tenant-shell";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { PayoutSummaryPanel } from "@/modules/payouts/components/payout-summary-panel";
import { PayoutsTable } from "@/modules/payouts/components/payouts-table";

function PayoutsContent() {
  const { tenant } = useTenant();

  return (
    <DashboardContainer>
      <h1 className="font-[var(--font-display)] text-[var(--text-2xl)] leading-[var(--leading-tight)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
        Payouts
      </h1>
      <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
        {tenant ? `${tenant.name} — Payout ledger` : "Select a tenant"}
      </p>

      <div className="mt-[var(--space-6)] flex flex-col gap-[var(--space-5)]">
        <PayoutSummaryPanel tenantId={tenant?.id} />
        <PayoutsTable tenantId={tenant?.id} />
      </div>
    </DashboardContainer>
  );
}

export default function PayoutsPage() {
  return (
    <Suspense>
      <PayoutsContent />
    </Suspense>
  );
}
