"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPublicEvent } from "@/modules/application/api/get-public-event";
import { PublicApplicationForm } from "@/modules/application/components/public-application-form";

type Props = {
  params: Promise<{ eventSlug: string }>;
};

export default function ApplyPage({ params }: Props) {
  // Next 15: params is a Promise — unwrap with React.use()
  const { eventSlug } = use(params);

  const { data, isLoading, error } = useQuery({
    queryKey: ["public-event", eventSlug],
    queryFn: () => getPublicEvent(eventSlug),
    retry: false,
  });

  return (
    <main className="min-h-screen bg-[var(--color-background)] px-[var(--space-6)] py-[var(--space-10)]">
      {isLoading && (
        <div className="mx-auto max-w-[44rem] text-center font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
          Loading…
        </div>
      )}

      {error && (
        <div className="mx-auto max-w-[44rem] rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface-card)] px-[var(--space-7)] py-[var(--space-7)] text-center">
          <h1 className="font-[var(--font-display)] text-[2rem] font-bold leading-[1.1] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
            Event not found
          </h1>
          <p className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-secondary)]">
            We couldn't find an event called <code>{eventSlug}</code>. Double-check the link from the organizer.
          </p>
        </div>
      )}

      {data && (
        <PublicApplicationForm
          eventSlug={data.campaignSlug}
          eventName={data.campaignName}
          organizerName={data.tenantName}
          commissionRateBps={data.commissionRateBps}
        />
      )}
    </main>
  );
}
