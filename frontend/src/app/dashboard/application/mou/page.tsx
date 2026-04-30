"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import { createMouSigningUrl, getMouStatus, useApplicationStatus } from "@/modules/application";
import { useTenant } from "@/modules/tenant-shell";

function statusCopy(mouStatus: string | null | undefined): string {
  switch (mouStatus) {
    case "created":
    case "failed":
      return "Your MOU is being prepared. If this does not change soon, contact the organizer.";
    case "declined":
      return "This MOU was declined. Contact the organizer if you need a new MOU issued.";
    case "expired":
      return "This MOU has expired. Contact the organizer to reissue the document.";
    case "signed":
      return "MOU signed. We are activating your marketing partner account.";
    case "viewed":
      return "You have opened the MOU. Finish signing to activate marketing partner access.";
    default:
      return "Your application is approved. Sign the marketing partner MOU to activate your dashboard access.";
  }
}

export default function MouSigningPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const { data: applicationStatus, isLoading } = useApplicationStatus(tenant?.id);
  const applicationId = applicationStatus?.applicationId ?? null;
  const [signUrl, setSignUrl] = useState<string | null>(null);
  const [awaitingActivation, setAwaitingActivation] = useState(searchParams.get("signed") === "1");
  const [pollStartedAt, setPollStartedAt] = useState<number | null>(
    searchParams.get("signed") === "1" ? Date.now() : null,
  );
  const pollingExpired = !!pollStartedAt && Date.now() - pollStartedAt > 10 * 60 * 1000;
  const redirectedRef = useRef(false);

  const mouQuery = useQuery({
    queryKey: ["mou-status", applicationId ?? "missing"],
    queryFn: () => getMouStatus(applicationId!),
    enabled: !!applicationId && applicationStatus?.status === "approved_pending_mou",
    refetchInterval: awaitingActivation && !pollingExpired ? 3000 : false,
    refetchIntervalInBackground: false,
  });

  const signingMutation = useMutation({
    mutationFn: () => createMouSigningUrl(applicationId!),
    onSuccess: (url) => {
      setSignUrl(url);
      setAwaitingActivation(true);
      setPollStartedAt(Date.now());
    },
  });

  useEffect(() => {
    if (redirectedRef.current) return;
    if (applicationStatus?.status === "approved" || mouQuery.data?.applicationStatus === "approved") {
      // Stop the 3s mou-status poll BEFORE navigating, and latch the
      // redirect so it cannot fire twice. mouQuery.data flips first, then
      // the application-status invalidation flips applicationStatus.status,
      // which would otherwise re-enter the effect mid-navigation.
      redirectedRef.current = true;
      setAwaitingActivation(false);
      setPollStartedAt(null);
      queryClient.invalidateQueries({ queryKey: ["application-status"] });
      router.replace("/dashboard");
    }
  }, [applicationStatus?.status, mouQuery.data?.applicationStatus, queryClient, router]);

  const message = useMemo(
    () => statusCopy(mouQuery.data?.mouStatus ?? applicationStatus?.mouStatus),
    [applicationStatus?.mouStatus, mouQuery.data?.mouStatus],
  );

  if (isLoading) {
    return (
      <DashboardContainer>
        <DashboardStageCanvas centered>
          <div className="font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.58)]">
            Loading MOU status…
          </div>
        </DashboardStageCanvas>
      </DashboardContainer>
    );
  }

  if (applicationStatus?.status !== "approved_pending_mou") {
    return (
      <DashboardContainer>
        <DashboardStageCanvas centered>
          <section className="max-w-[44rem] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-8)] py-[var(--space-8)] text-center shadow-[var(--shadow-card)]">
            <h1 className="font-[var(--font-display)] text-[2.5rem] font-bold leading-none tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
              No MOU Required
            </h1>
            <p className="mt-[var(--space-5)] font-[var(--font-sans)] text-[var(--text-base)] leading-[1.7] text-[rgba(255,255,255,0.72)]">
              Your current application state does not require an MOU signature.
            </p>
          </section>
        </DashboardStageCanvas>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <DashboardStageCanvas>
        <section className="mx-auto w-full max-w-[72rem] rounded-[var(--radius)] border border-[var(--color-border)] bg-[rgba(15,23,42,0.72)] p-[var(--space-8)] shadow-[var(--shadow-card)]">
          <div className="flex flex-col gap-[var(--space-4)] lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="font-[var(--font-sans)] text-[var(--text-xs)] font-semibold uppercase tracking-[0.18em] text-[var(--color-primary)]">
                Marketing Partner MOU
              </p>
              <h1 className="mt-[var(--space-3)] font-[var(--font-display)] text-[3rem] font-bold leading-none tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
                Sign the MOU to activate access
              </h1>
              <p className="mt-[var(--space-4)] max-w-[44rem] font-[var(--font-sans)] text-[var(--text-lg)] leading-[1.65] text-[rgba(255,255,255,0.76)]">
                {message}
              </p>
              {mouQuery.data?.signerEmail && (
                <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.52)]">
                  Signer: {mouQuery.data.signerName} · {mouQuery.data.signerEmail}
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-[var(--space-3)]">
              <button
                type="button"
                onClick={() => signingMutation.mutate()}
                disabled={!applicationId || signingMutation.isPending || mouQuery.data?.mouStatus === "signed"}
                className="h-[44px] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-5)] font-[var(--font-sans)] text-[var(--text-sm)] font-semibold text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signingMutation.isPending ? "Preparing…" : "Sign MOU"}
              </button>
              <button
                type="button"
                onClick={() => mouQuery.refetch()}
                className="h-[44px] rounded-[var(--radius)] border border-[rgba(255,255,255,0.16)] px-[var(--space-5)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.30)]"
              >
                Refresh status
              </button>
            </div>
          </div>

          {signingMutation.error instanceof Error && (
            <div className="mt-[var(--space-5)] rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-4)] py-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FCA5A5]">
              {signingMutation.error.message}
            </div>
          )}

          {awaitingActivation && !pollingExpired && (
            <div className="mt-[var(--space-5)] rounded-[var(--radius)] border border-[rgba(59,130,246,0.25)] bg-[rgba(59,130,246,0.10)] px-[var(--space-4)] py-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] text-[#BFDBFE]">
              We’ll keep checking for the completed MOU and unlock your dashboard automatically.
            </div>
          )}

          {pollingExpired && (
            <div className="mt-[var(--space-5)] rounded-[var(--radius)] border border-[rgba(245,158,11,0.30)] bg-[rgba(245,158,11,0.10)] px-[var(--space-4)] py-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FDE68A]">
              We have not received the completed MOU yet. If you already signed, refresh status or contact the organizer so they can verify the BoldSign webhook.
            </div>
          )}

          {signUrl && (
            <div className="mt-[var(--space-6)]">
              <div className="mb-[var(--space-3)] flex items-center justify-between gap-[var(--space-4)]">
                <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.62)]">
                  If the embedded signer does not load, open the secure signing link in a new tab.
                </p>
                <a
                  href={signUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 rounded-[var(--radius)] border border-[rgba(255,255,255,0.16)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]"
                >
                  Open new tab
                </a>
              </div>
              <iframe
                src={signUrl}
                title="Marketing Partner MOU signer"
                className="h-[42rem] w-full rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-white"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          )}
        </section>
      </DashboardStageCanvas>
    </DashboardContainer>
  );
}
