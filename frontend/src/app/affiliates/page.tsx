"use client";

import { Suspense, useState } from "react";
import { useTenant } from "@/modules/tenant-shell";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { AffiliatesTable } from "@/modules/affiliates/components/affiliates-table";
import { AffiliateDetailsPanel } from "@/modules/affiliates/components/affiliate-details-panel";

function AffiliatesContent() {
  const { tenant } = useTenant();
  const [selectedId, setSelectedId] = useState<string>();

  return (
    <DashboardContainer>
      <h1 className="font-[var(--font-display)] text-[var(--text-2xl)] leading-[var(--leading-tight)] font-bold text-[var(--color-text-primary)] tracking-[var(--tracking-heading)]">
        Marketing Partners
      </h1>
      <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
        {tenant ? `${tenant.name} — Manage marketing partners` : "Select a tenant"}
      </p>

      <div className="mt-[var(--space-6)] flex flex-col gap-[var(--space-5)]">
        <AffiliatesTable
          tenantId={tenant?.id}
          onSelect={setSelectedId}
        />
        <AffiliateDetailsPanel
          tenantId={tenant?.id}
          affiliateId={selectedId}
          onClose={() => setSelectedId(undefined)}
        />
      </div>
    </DashboardContainer>
  );
}

export default function AffiliatesPage() {
  return (
    <Suspense>
      <AffiliatesContent />
    </Suspense>
  );
}
