"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";

type Application = {
  id: string;
  applyingAs: "individual" | "company";
  firstName: string;
  email: string;
  individualFullName: string | null;
  telegramUsername: string | null;
  companyName: string | null;
  contactPersonName: string | null;
  contactPersonEmail: string | null;
  signatoryName: string | null;
  signatoryEmail: string | null;
  contactPersonTelegramUsername: string | null;
  communicationChannels: string[];
  emailDatabaseSize: string | null;
  telegramGroupLink: string | null;
  xProfileLink: string | null;
  redditProfileLink: string | null;
  linkedInProfileLink: string | null;
  instagramAccountLink: string | null;
  discordServerLink: string | null;
  socialProfiles: string | null;
  audienceSize: string | null;
  experience: string | null;
  fitReason: string | null;
  requestedCode: string | null;
  status: "pending" | "approved_pending_mou" | "approved" | "rejected";
  affiliateId: string | null;
  mouStatus: "created" | "sent" | "viewed" | "signed" | "declined" | "expired" | "voided" | "failed" | null;
  mouSignerEmail: string | null;
  mouSignerName: string | null;
  campaignId: string;
  campaignName: string;
  campaignSlug: string;
  createdAt: string;
  reviewedAt: string | null;
};

type ApplicationsListResponse = {
  applications: Application[];
};

export default function ApplicationsReviewPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"pending" | "approved_pending_mou" | "approved" | "rejected" | "all">("pending");
  const searchParams = useSearchParams();
  const searchTerm = (searchParams.get("search") ?? "").trim().toLowerCase();

  const { data, isLoading, error } = useQuery({
    queryKey: ["applications", filter],
    queryFn: () =>
      apiClient<ApplicationsListResponse>("/applications", {
        searchParams: filter === "all" ? undefined : { status: filter },
      }),
  });

  // Search runs client-side because the applications list isn't paginated.
  // Matches firstName / email / companyName / requestedCode (all lower-cased).
  const filteredApplications = useMemo(() => {
    if (!data?.applications) return [];
    if (!searchTerm) return data.applications;
    return data.applications.filter((a) => {
      const haystack = [
        a.firstName,
        a.email,
        a.companyName,
        a.contactPersonName,
        a.contactPersonEmail,
        a.signatoryName,
        a.signatoryEmail,
        a.requestedCode,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [data?.applications, searchTerm]);

  const reviewMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      apiClient<{ id: string; status: string }>(`/applications/${id}/status`, {
        method: "PATCH",
        body: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
      queryClient.invalidateQueries({ queryKey: ["affiliate"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const resendMouMutation = useMutation({
    mutationFn: (id: string) =>
      apiClient<{ id: string; status: string; mouStatus: string }>(`/applications/${id}/mou/resend`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["applications"] });
    },
  });

  const errorMessage = error instanceof Error ? error.message : null;
  const reviewError = reviewMutation.error instanceof Error ? reviewMutation.error.message : null;

  return (
    <div className="px-[var(--space-8)] py-[var(--space-8)]">
      <header className="flex items-center justify-between gap-[var(--space-4)]">
        <div>
          <h1 className="font-[var(--font-display)] text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
            Applications
          </h1>
          <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
            Review and approve incoming affiliate applications.
          </p>
        </div>
        <div className="flex items-center gap-[var(--space-2)]">
          {(["pending", "approved_pending_mou", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`rounded-[var(--radius)] px-[var(--space-3)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-xs)] capitalize transition-colors ${
                filter === f
                  ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
                  : "border border-[rgba(255,255,255,0.12)] text-[rgba(255,255,255,0.70)] hover:border-[rgba(255,255,255,0.24)]"
              }`}
            >
              {f.replaceAll("_", " ")}
            </button>
          ))}
        </div>
      </header>

      {reviewError && (
        <div className="mt-[var(--space-5)] rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FCA5A5]">
          Review failed: {reviewError}
        </div>
      )}
      {errorMessage && (
        <div className="mt-[var(--space-5)] rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FCA5A5]">
          {errorMessage}
        </div>
      )}

      <div className="mt-[var(--space-6)] flex flex-col gap-[var(--space-4)]">
        {isLoading && (
          <div className="font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
            Loading…
          </div>
        )}

        {data && filteredApplications.length === 0 && (
          <div className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-transparent px-[var(--space-6)] py-[var(--space-6)] text-center font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
            {searchTerm
              ? `No applications match "${searchTerm}".`
              : `No ${filter === "all" ? "" : filter} applications.`}
          </div>
        )}

        {filteredApplications.map((app) => (
          <article
            key={app.id}
            className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-transparent p-[var(--space-5)]"
          >
            <header className="flex items-start justify-between gap-[var(--space-4)]">
              <div>
                <h2 className="font-[var(--font-display)] text-[var(--text-lg)] font-bold leading-none tracking-[-0.02em] text-[var(--color-text-primary)]">
                  {app.firstName}
                </h2>
                <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.55)]">
                  {app.email} · {app.campaignName} · applied {new Date(app.createdAt).toLocaleDateString()}
                </p>
              </div>

              <StatusBadge status={app.status} />
            </header>

            <dl className="mt-[var(--space-4)] grid gap-[var(--space-3)] text-[var(--text-sm)] text-[rgba(255,255,255,0.78)] lg:grid-cols-2">
              <div>
                <dt className="text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)]">
                  Applying as
                </dt>
                <dd className="mt-[var(--space-1)] capitalize">{app.applyingAs}</dd>
              </div>
              {app.communicationChannels.length > 0 && (
                <div>
                  <dt className="text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)]">
                    Channels
                  </dt>
                  <dd className="mt-[var(--space-1)] capitalize">
                    {app.communicationChannels.join(", ").replaceAll("_", " ")}
                  </dd>
                </div>
              )}
              {app.applyingAs === "individual" && app.telegramUsername && (
                <div>
                  <dt className="text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)]">
                    Telegram
                  </dt>
                  <dd className="mt-[var(--space-1)]">{app.telegramUsername}</dd>
                </div>
              )}
              {app.applyingAs === "company" && app.contactPersonName && (
                <div>
                  <dt className="text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)]">
                    Contact Person
                  </dt>
                  <dd className="mt-[var(--space-1)]">
                    {app.contactPersonName}
                    {app.contactPersonEmail ? ` · ${app.contactPersonEmail}` : ""}
                  </dd>
                </div>
              )}
              {app.applyingAs === "company" && app.signatoryName && (
                <div>
                  <dt className="text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)]">
                    Signatory
                  </dt>
                  <dd className="mt-[var(--space-1)]">
                    {app.signatoryName}
                    {app.signatoryEmail ? ` · ${app.signatoryEmail}` : ""}
                  </dd>
                </div>
              )}
              {app.emailDatabaseSize && (
                <div>
                  <dt className="text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)]">
                    Email Database Size
                  </dt>
                  <dd className="mt-[var(--space-1)]">{app.emailDatabaseSize}</dd>
                </div>
              )}
              {app.experience && (
                <div className="lg:col-span-2">
                  <dt className="text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)]">
                    Experience
                  </dt>
                  <dd className="mt-[var(--space-1)]">{app.experience}</dd>
                </div>
              )}
              {app.requestedCode && (
                <div>
                  <dt className="text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.45)]">
                    Preferred Referral Code
                  </dt>
                  <dd className="mt-[var(--space-1)]">{app.requestedCode}</dd>
                </div>
              )}
            </dl>

            {app.status === "pending" && (
              <div className="mt-[var(--space-4)] flex items-center gap-[var(--space-3)]">
                <button
                  type="button"
                  onClick={() => reviewMutation.mutate({ id: app.id, status: "approved" })}
                  disabled={reviewMutation.isPending}
                  className="rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={() => reviewMutation.mutate({ id: app.id, status: "rejected" })}
                  disabled={reviewMutation.isPending}
                  className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.18)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.32)] disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}

            {app.status === "approved_pending_mou" && (
              <div className="mt-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-3)]">
                {(app.mouStatus === "failed" || app.mouStatus === "expired" || app.mouStatus === "declined") ? (
                  <div className="flex items-center gap-[var(--space-2)] rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-3)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[#FCA5A5]">
                    <span aria-hidden="true" className="inline-block size-[6px] rounded-full bg-[#EF4444]" />
                    MOU {app.mouStatus} — click Resend MOU to issue a new document
                  </div>
                ) : (
                  <div className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.55)]">
                    MOU {app.mouStatus ?? "created"} · signer:{" "}
                    <span className="text-[var(--color-text-primary)]">
                      {app.mouSignerName ?? "Unknown"} {app.mouSignerEmail ? `· ${app.mouSignerEmail}` : ""}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => resendMouMutation.mutate(app.id)}
                  disabled={resendMouMutation.isPending}
                  className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.18)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.32)] disabled:opacity-50"
                >
                  Resend MOU
                </button>
              </div>
            )}

            {app.status === "approved" && app.affiliateId && (
              <div className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.55)]">
                Approved · affiliate id: <code className="text-[var(--color-text-primary)]">{app.affiliateId}</code>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "approved_pending_mou" | "approved" | "rejected" }) {
  const styles = {
    pending: "border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.04)] text-[rgba(255,255,255,0.70)]",
    approved_pending_mou: "border-[rgba(59,130,246,0.30)] bg-[rgba(59,130,246,0.12)] text-[#93C5FD]",
    approved: "border-[rgba(34,197,94,0.30)] bg-[rgba(34,197,94,0.12)] text-[#22C55E]",
    rejected: "border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.10)] text-[#FCA5A5]",
  } as const;
  return (
    <span
      className={`inline-flex items-center gap-[var(--space-1)] rounded-full border px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium capitalize ${styles[status]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
