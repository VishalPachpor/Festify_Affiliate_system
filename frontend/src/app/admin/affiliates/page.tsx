"use client";

import { useState } from "react";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import { useTenant } from "@/modules/tenant-shell";
import { useAffiliatesList } from "@/modules/affiliates/hooks/use-affiliates-list";
import { useAffiliatesFilters } from "@/modules/affiliates/hooks/use-affiliates-filters";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import type { Affiliate } from "@/modules/affiliates/types";

const PAGE_SIZE = 6;
const TIER_FILTERS = ["all", "bronze", "silver", "gold", "platinum", "none"] as const;

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCurrency(minorUnits: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

// ── Colors ────────────────────────────────────────────────────────────────────

const AVATAR_COLORS: Record<string, string> = {
  SC: "#2B7A78",
  MW: "#2B7A78",
  DK: "#22C55E",
  LT: "#5B8DEF",
  AP: "#F5A623",
  RJ: "#22C55E",
  KL: "#EAB308",
  TM: "#5B8DEF",
  NW: "#F5A623",
  JB: "#EF4444",
};

const TIER_STYLES: Record<string, { bg: string; text: string }> = {
  platinum: { bg: "rgba(34,197,94,0.14)", text: "#22C55E" },
  gold:     { bg: "rgba(234,179,8,0.14)", text: "#EAB308" },
  silver:   { bg: "rgba(148,163,184,0.14)", text: "#94A3B8" },
  bronze:   { bg: "rgba(217,119,6,0.14)", text: "#D97706" },
};

const REFERRAL_CODE_STYLE = { bg: "rgba(196,162,77,0.12)", text: "#C4A24D" };

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconInvite() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M2 13c0-2.2 1.8-4 4-4s4 1.8 4 4" />
      <path d="M13 5v4M11 7h4" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <circle cx="6" cy="6" r="4" />
      <path d="M9.5 9.5L13 13" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4.5l3 3 3-3" />
    </svg>
  );
}

function IconView() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" />
      <circle cx="8" cy="8" r="2" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11.5 2.5l2 2L5 13H3v-2l8.5-8.5z" />
    </svg>
  );
}

function IconMore() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="8" cy="3" r="1.2" />
      <circle cx="8" cy="8" r="1.2" />
      <circle cx="8" cy="13" r="1.2" />
    </svg>
  );
}

function IconApprove() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#22C55E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

function IconReject() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="8" cy="8" r="5" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" />
    </svg>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ initials, color }: { initials: string; color?: string }) {
  const bg = color ?? AVATAR_COLORS[initials] ?? "#5B8DEF";
  return (
    <div
      className="flex size-[2.2rem] shrink-0 items-center justify-center rounded-full"
      style={{ background: bg }}
    >
      <span className="font-[var(--font-sans)] text-[0.7rem] font-semibold text-white">
        {initials}
      </span>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const style = TIER_STYLES[tier];
  if (!style) return <span className="text-[rgba(255,255,255,0.3)]">--</span>;
  return (
    <span
      className="inline-block rounded-[var(--space-1)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
      style={{ background: style.bg, color: style.text }}
    >
      {tier}
    </span>
  );
}

function ReferralCodeBadge({ code }: { code: string }) {
  return (
    <span
      className="inline-block rounded-[var(--space-1)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
      style={{ background: REFERRAL_CODE_STYLE.bg, color: REFERRAL_CODE_STYLE.text }}
    >
      {code}
    </span>
  );
}

function StatusCell({ status }: { status: "active" | "pending" | "rejected" }) {
  if (status === "active") {
    return (
      <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.55)]">
        active
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span
        className="inline-block rounded-[var(--space-1)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
        style={{ background: "rgba(234,179,8,0.14)", color: "#EAB308" }}
      >
        pending
      </span>
    );
  }
  return (
    <span
      className="inline-block rounded-[var(--space-1)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
      style={{ background: "rgba(239,68,68,0.14)", color: "#EF4444" }}
    >
      rejected
    </span>
  );
}

function ActionButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex items-center justify-center text-[rgba(255,255,255,0.40)] transition-colors hover:text-[rgba(255,255,255,0.80)]"
    >
      {children}
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminAffiliatesPage() {
  const { tenant } = useTenant();
  const { filters, setFilters } = useAffiliatesFilters();
  const { data } = useAffiliatesList(tenant?.id, { ...filters, pageSize: PAGE_SIZE });
  const queryClient = useQueryClient();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFeedback, setInviteFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [approveTarget, setApproveTarget] = useState<{ id: string; name: string; requestedCode: string } | null>(null);
  const [approveCode, setApproveCode] = useState("");
  const [postApprovalCode, setPostApprovalCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const reviewMutation = useMutation({
    mutationFn: ({ id, status, referralCode }: { id: string; status: "approved" | "rejected"; referralCode?: string }) =>
      apiClient(`/applications/${id}/status`, {
        method: "PATCH",
        body: { status, referralCode },
      }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["affiliates"] });
      if (variables.status === "approved") {
        setPostApprovalCode(variables.referralCode ?? approveCode);
        setApproveTarget(null);
      }
    },
  });

  const verifyCodeMutation = useMutation({
    mutationFn: (affiliateId: string) =>
      apiClient(`/affiliates/${affiliateId}/verify-code`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliates"] });
      setPostApprovalCode(null);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email }: { email: string }) =>
      apiClient<{ success: boolean; applyUrl: string }>("/affiliates/invite", {
        method: "POST",
        body: { email },
      }),
    onSuccess: (result, variables) => {
      setInviteEmail("");
      setIsInviteOpen(false);
      setInviteFeedback({
        kind: "success",
        message: `Invite sent to ${variables.email}. Application link: ${result.applyUrl}`,
      });
    },
    onError: (error) => {
      setInviteFeedback({
        kind: "error",
        message: error instanceof Error ? error.message : "Failed to send invite",
      });
    },
  });

  const affiliates: Affiliate[] = data?.affiliates ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = filters.page;

  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, total);

  // Page numbers
  const pageNumbers: number[] = [];
  const maxBtns = 3;
  let sp = Math.max(1, currentPage - 1);
  const ep = Math.min(totalPages, sp + maxBtns - 1);
  if (ep - sp < maxBtns - 1) sp = Math.max(1, ep - maxBtns + 1);
  for (let i = sp; i <= ep; i++) pageNumbers.push(i);

  const currentTierFilter = filters.tier ?? "all";
  const nextTierFilter = TIER_FILTERS[(TIER_FILTERS.indexOf(currentTierFilter) + 1) % TIER_FILTERS.length];
  const tierLabel =
    currentTierFilter === "all"
      ? "All tiers"
      : currentTierFilter === "none"
        ? "No tier"
        : currentTierFilter;

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-[var(--font-display)] text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
              Affiliate Management
            </h2>
            <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
              Manage and monitor all affiliates
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setInviteFeedback(null);
              setIsInviteOpen((open) => !open);
            }}
            className="flex items-center gap-[0.5rem] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <IconInvite />
            Invite Affiliate
          </button>
        </div>

        {(isInviteOpen || inviteFeedback) && (
          <div className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.03)] p-[var(--space-4)]">
            <div className="flex flex-wrap items-end gap-[var(--space-3)]">
              <label className="flex min-w-[18rem] flex-1 flex-col gap-[var(--space-2)]">
                <span className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.55)]">
                  Affiliate email
                </span>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="h-[2.75rem] rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] px-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.35)] focus:border-[var(--color-ring)] focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => inviteMutation.mutate({ email: inviteEmail.trim() })}
                disabled={!inviteEmail.trim() || inviteMutation.isPending}
                className="h-[2.75rem] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-5)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {inviteMutation.isPending ? "Sending..." : "Send invite"}
              </button>
            </div>
            {inviteFeedback && (
              <p
                className="mt-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)]"
                style={{ color: inviteFeedback.kind === "success" ? "#86EFAC" : "#FCA5A5" }}
              >
                {inviteFeedback.message}
              </p>
            )}
          </div>
        )}

        {/* Search + Filters */}
        <div className="flex items-center gap-[var(--space-3)]">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-[var(--space-3)] top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.40)]">
              <IconSearch />
            </span>
            <input
              type="search"
              placeholder="Search affiliates..."
              value={filters.search ?? ""}
              onChange={(e) => { setFilters({ search: e.target.value || undefined }); }}
              className="h-[2.5rem] w-full rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] pl-[2.2rem] pr-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.35)] focus:border-[var(--color-ring)] focus:outline-none transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => { const next = !filters.status ? "approved" : filters.status === "approved" ? "pending" : undefined; setFilters({ status: next }); }}
            className="flex items-center gap-[0.4rem] rounded-[var(--radius)] bg-[rgba(255,255,255,0.06)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.10)]"
          >
            {!filters.status ? "All status" : filters.status}
            <IconChevronDown />
          </button>
          <button
            type="button"
            onClick={() => setFilters({ tier: nextTierFilter === "all" ? undefined : nextTierFilter })}
            className="flex items-center gap-[0.4rem] rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)]"
          >
            {tierLabel}
            <IconChevronDown />
          </button>
        </div>

        {/* Table */}
        <div className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent">
          <div className="overflow-x-auto px-[var(--space-6)] py-[var(--space-5)]">
            <table className="w-full border-collapse font-[var(--font-sans)]" aria-label="Affiliates">
              <thead>
                <tr>
                  {["Name", "Referral Code", "Tier", "Referrals", "Revenue", "Commission Due", "Status", "Actions"].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="pb-[var(--space-3)] text-left text-[var(--text-xs)] leading-[var(--leading-caption)] tracking-[var(--tracking-caption)] uppercase font-semibold whitespace-nowrap pr-[var(--space-4)] last:pr-0 text-[rgba(255,255,255,0.45)]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {affiliates.map((aff) => {
                  const initials = aff.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
                  return (
                  <tr key={aff.id} className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {/* Name + email */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] whitespace-nowrap">
                      <div className="flex items-center gap-[var(--space-3)]">
                        <Avatar initials={initials} />
                        <div>
                          <p className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">
                            {aff.name}
                          </p>
                          <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.45)]">
                            {aff.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    {/* Referral Code */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] whitespace-nowrap">
                      {aff.referralCode ? (
                        <ReferralCodeBadge code={aff.referralCode} />
                      ) : (
                        <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.35)]">--</span>
                      )}
                    </td>
                    {/* Tier */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] whitespace-nowrap">
                      {aff.tier ? (
                        <TierBadge tier={aff.tier} />
                      ) : (
                        <span className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.35)]">--</span>
                      )}
                    </td>
                    {/* Referrals */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] text-center whitespace-nowrap text-[rgba(255,255,255,0.60)]">
                      {aff.totalSales}
                    </td>
                    {/* Revenue */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] whitespace-nowrap text-[#FFFFFF]">
                      {formatCurrency(aff.totalRevenue)}
                    </td>
                    {/* Commission Due */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] whitespace-nowrap text-[#22C55E]">
                      {formatCurrency(aff.totalCommission)}
                    </td>
                    {/* Status */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] whitespace-nowrap">
                      <StatusCell status={aff.status === "approved" ? "active" : aff.status} />
                    </td>
                    {/* Actions */}
                    <td className="py-[var(--space-3)] whitespace-nowrap">
                      <div className="flex items-center gap-[0.5rem]">
                        <ActionButton label="View" onClick={() => setSelectedAffiliate(aff)}><IconView /></ActionButton>
                        {aff.status === "pending" && (
                          <>
                            <ActionButton
                              label="Approve"
                              onClick={() => {
                                setApproveTarget({ id: aff.id, name: aff.name, requestedCode: aff.requestedCode ?? "" });
                                setApproveCode(aff.requestedCode ?? "");
                              }}
                            >
                              <IconApprove />
                            </ActionButton>
                            <ActionButton
                              label="Reject"
                              onClick={() => reviewMutation.mutate({ id: aff.id, status: "rejected" })}
                            >
                              <IconReject />
                            </ActionButton>
                          </>
                        )}
                        <ActionButton label="Edit" onClick={() => setSelectedAffiliate(aff)}><IconEdit /></ActionButton>
                        <ActionButton label="More" onClick={() => setSelectedAffiliate(aff)}><IconMore /></ActionButton>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between border-t px-[var(--space-6)] py-[var(--space-4)]" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.45)]">
                Showing {startItem}-{endItem} of {total} affiliates
              </p>
              <div className="flex gap-[var(--space-2)]">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters({ page: currentPage - 1 })}
                  className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.60)] transition-colors hover:border-[rgba(255,255,255,0.20)] hover:text-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-40"
                >
                  Previous
                </button>
                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFilters({ page: num })}
                    className={[
                      "rounded-[var(--radius)] border px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] transition-colors",
                      currentPage === num
                        ? "border-[#5B8DEF] bg-[#5B8DEF] text-white"
                        : "border-[rgba(255,255,255,0.12)] bg-transparent text-[rgba(255,255,255,0.60)] hover:border-[rgba(255,255,255,0.20)] hover:text-[var(--color-text-primary)]",
                    ].join(" ")}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters({ page: currentPage + 1 })}
                  className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.60)] transition-colors hover:border-[rgba(255,255,255,0.20)] hover:text-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </DashboardContainer>

      {/* Affiliate Detail Panel */}
      {selectedAffiliate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.60)]" onClick={() => setSelectedAffiliate(null)}>
          <div
            className="w-full max-w-[28rem] rounded-[0.75rem] border border-[rgba(255,255,255,0.08)] bg-[#111525] px-[2rem] py-[1.75rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-[var(--font-display)] text-[1.5rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
                Affiliate Details
              </h2>
              <button
                type="button"
                onClick={() => setSelectedAffiliate(null)}
                className="text-[rgba(255,255,255,0.40)] transition-colors hover:text-[var(--color-text-primary)]"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l10 10M14 4L4 14" /></svg>
              </button>
            </div>

            <div className="mt-[1.5rem] flex flex-col gap-[1.25rem]">
              <div className="flex items-center gap-[0.75rem]">
                <div className="flex size-[3rem] shrink-0 items-center justify-center rounded-full bg-[var(--color-avatar-bg)]">
                  <span className="font-[var(--font-sans)] text-[0.9rem] font-semibold text-white">
                    {selectedAffiliate.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-[var(--font-sans)] text-[var(--text-base)] font-medium text-[var(--color-text-primary)]">{selectedAffiliate.name}</p>
                  <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">{selectedAffiliate.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-[1rem]">
                <div>
                  <p className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.50)]">Status</p>
                  <p className="mt-[0.25rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">{selectedAffiliate.status === "approved" ? "Active" : selectedAffiliate.status}</p>
                </div>
                <div>
                  <p className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.50)]">Referral Code</p>
                  <p className="mt-[0.25rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">{selectedAffiliate.referralCode ?? "—"}</p>
                </div>
                <div>
                  <p className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.50)]">Revenue</p>
                  <p className="mt-[0.25rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">{formatCurrency(selectedAffiliate.totalRevenue)}</p>
                </div>
                <div>
                  <p className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.50)]">Commission Due</p>
                  <p className="mt-[0.25rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[#22C55E]">{formatCurrency(selectedAffiliate.totalCommission)}</p>
                </div>
                <div>
                  <p className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.50)]">Total Sales</p>
                  <p className="mt-[0.25rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">{selectedAffiliate.totalSales}</p>
                </div>
                <div>
                  <p className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] text-[rgba(255,255,255,0.50)]">Joined</p>
                  <p className="mt-[0.25rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)]">{new Date(selectedAffiliate.joinedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedAffiliate(null)}
              className="mt-[1.5rem] w-full rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent py-[0.6rem] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Approve modal — editable code */}
      {approveTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.60)]" onClick={() => setApproveTarget(null)}>
          <div className="w-full max-w-[26rem] rounded-[0.75rem] border border-[rgba(255,255,255,0.08)] bg-[#111525] px-[2rem] py-[1.75rem]" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-[var(--font-display)] text-[var(--text-xl)] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
              Approve {approveTarget.name}
            </h2>
            <p className="mt-[0.4rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.55)]">
              Confirm or modify the referral/coupon code before approving.
            </p>

            <div className="mt-[1.25rem] flex flex-col gap-[0.4rem]">
              <label className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] font-semibold text-[rgba(255,255,255,0.50)]">
                Referral Code
              </label>
              <input
                type="text"
                value={approveCode}
                onChange={(e) => setApproveCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                placeholder="e.g. VISHAL20"
                maxLength={20}
                className="h-[2.75rem] w-full rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-[var(--space-4)] font-mono text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.30)] focus:border-[var(--color-ring)] focus:outline-none"
              />
              {approveTarget.requestedCode && (
                <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.40)]">
                  Requested: {approveTarget.requestedCode}
                </p>
              )}
            </div>

            <div className="mt-[1.25rem] flex gap-[var(--space-3)]">
              <button
                type="button"
                onClick={() => setApproveTarget(null)}
                className="flex-1 rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!approveCode || approveCode.length < 3 || reviewMutation.isPending}
                onClick={() => reviewMutation.mutate({ id: approveTarget.id, status: "approved", referralCode: approveCode })}
                className="flex-1 rounded-[var(--radius)] bg-[#22C55E] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-white transition-colors hover:bg-[#16A34A] disabled:opacity-50"
              >
                {reviewMutation.isPending ? "Approving..." : "Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-approval: Luma instructions modal */}
      {postApprovalCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.60)]">
          <div className="w-full max-w-[30rem] rounded-[0.75rem] border border-[rgba(34,197,94,0.20)] bg-[#111525] px-[2rem] py-[1.75rem]">
            <div className="flex items-center gap-[0.5rem]">
              <span className="flex size-[1.5rem] items-center justify-center rounded-full bg-[rgba(34,197,94,0.15)]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l3 3 5-5" /></svg>
              </span>
              <h2 className="font-[var(--font-display)] text-[var(--text-xl)] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
                Affiliate Approved!
              </h2>
            </div>
            <p className="mt-[0.6rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.55)]">
              Now create this coupon code in Luma so ticket sales are tracked.
            </p>

            {/* Code to copy */}
            <div className="mt-[1rem] flex items-center gap-[0.5rem] rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(0,0,0,0.25)] px-[var(--space-4)] py-[0.6rem]">
              <code className="flex-1 font-mono text-[var(--text-lg)] font-bold text-[#22C55E]">{postApprovalCode}</code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(postApprovalCode); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                className={`rounded-[var(--radius)] border px-[0.6rem] py-[0.25rem] font-[var(--font-sans)] text-[var(--text-xs)] transition-colors ${codeCopied ? "border-[rgba(34,197,94,0.40)] text-[#22C55E]" : "border-[rgba(255,255,255,0.12)] text-[var(--color-text-primary)] hover:border-[rgba(255,255,255,0.20)]"}`}
              >
                {codeCopied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Steps */}
            <ol className="mt-[1rem] flex flex-col gap-[0.5rem]">
              {[
                "Go to Luma → Calendar → Settings → Developer",
                "Create a new coupon with the code above",
                "Set discount amount (0% for tracking only, or a real discount)",
                "Come back and click Confirm below",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-[0.5rem]">
                  <span className="flex size-[1.3rem] shrink-0 items-center justify-center rounded-full bg-[rgba(91,141,239,0.15)] font-[var(--font-sans)] text-[var(--text-xs)] font-semibold text-[#5B8DEF]">{i + 1}</span>
                  <span className="font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.3rem] text-[rgba(255,255,255,0.70)]">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-[1.25rem] flex gap-[var(--space-3)]">
              <button
                type="button"
                onClick={() => setPostApprovalCode(null)}
                className="flex-1 rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)]"
              >
                I'll do it later
              </button>
              <button
                type="button"
                onClick={() => {
                  // Find the just-approved affiliate and verify
                  const latest = affiliates.find(a => a.referralCode === postApprovalCode);
                  if (latest) verifyCodeMutation.mutate(latest.id);
                  else setPostApprovalCode(null);
                }}
                disabled={verifyCodeMutation.isPending}
                className="flex-1 rounded-[var(--radius)] bg-[#22C55E] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-white transition-colors hover:bg-[#16A34A] disabled:opacity-50"
              >
                {verifyCodeMutation.isPending ? "Confirming..." : "Confirm — Created in Luma"}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardStageCanvas>
  );
}
