"use client";

import { useTenant } from "@/modules/tenant-shell";
import { useApplicationStatus } from "@/modules/application";
import { ApplicationForm } from "@/modules/application/components/application-form";
import { ApplicationStatusCard } from "@/modules/application/components/application-status-card";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";

function ApplicationSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading application status"
      className="mx-auto flex max-w-[49rem] flex-col items-center gap-[var(--space-6)] py-[var(--space-12)]"
    >
      <div className="size-[5.25rem] animate-pulse rounded-full bg-[var(--color-border)]" />
      <div className="h-[var(--text-2xl)] w-2/3 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      <div className="h-[var(--text-base)] w-3/4 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
    </div>
  );
}

export default function AffiliateApplicationPage() {
  const { tenant } = useTenant();
  const { data, isLoading } = useApplicationStatus(tenant?.id);

  const status = data?.status ?? "not_applied";

  if (isLoading) {
    return (
      <DashboardContainer>
        <DashboardStageCanvas centered>
          <ApplicationSkeleton />
        </DashboardStageCanvas>
      </DashboardContainer>
    );
  }

  if (status === "pending") {
    return (
      <DashboardContainer>
        <DashboardStageCanvas centered>
          <ApplicationStatusCard variant="submitted" />
        </DashboardStageCanvas>
      </DashboardContainer>
    );
  }

  if (status === "rejected") {
    return (
      <DashboardContainer>
        <DashboardStageCanvas centered>
          <ApplicationStatusCard variant="rejected" />
        </DashboardStageCanvas>
      </DashboardContainer>
    );
  }

  if (status === "approved") {
    return (
      <DashboardContainer>
        <DashboardStageCanvas centered>
          <section className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-8)] py-[calc(var(--space-8)+var(--space-2))] text-center shadow-[var(--shadow-card)]">
            <div className="mx-auto flex size-[5.25rem] items-center justify-center rounded-full bg-[rgba(52,168,83,0.22)]">
              <span className="text-[var(--color-success)]">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="m5 12 4.2 4.2L19 6.5" />
                </svg>
              </span>
            </div>
            <h2 className="mt-[var(--space-8)] font-[var(--font-display)] text-[3rem] font-bold leading-[1.08] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
              Application Approved
            </h2>
            <p className="mx-auto mt-[var(--space-6)] max-w-[39rem] font-[var(--font-sans)] text-[1.15rem] leading-[1.7] text-[var(--color-text-primary)]/85">
              Your affiliate application has been approved. Head to the dashboard to start tracking your performance.
            </p>
          </section>
        </DashboardStageCanvas>
      </DashboardContainer>
    );
  }

  // status === "not_applied"
  return (
    <DashboardContainer>
      <DashboardStageCanvas>
        <ApplicationForm />
      </DashboardStageCanvas>
    </DashboardContainer>
  );
}
