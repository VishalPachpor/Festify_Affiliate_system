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
import { AffiliateDetailDrawer } from "@/modules/affiliates/components/affiliate-detail-drawer";

const PAGE_SIZE = 6;
const TIER_FILTERS = ["all", "starter", "riser", "pro", "elite", "none"] as const;

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
  AD: "#5B8DEF",  // Alex Demo
  SC: "#C9A84C",  // Sarah Chen (gold/warm)
  MJ: "#2B7A78",  // Marcus Johnson (teal)
  PS: "#9B59B6",  // Priya Sharma (purple)
  JW: "#E67E22",  // James Wilson (orange)
  DK: "#22C55E",
  LT: "#5B8DEF",
  AP: "#F5A623",
  RJ: "#22C55E",
  KL: "#EAB308",
  TM: "#5B8DEF",
  NW: "#F5A623",
  JB: "#EF4444",
};

const TIER_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  elite:   { bg: "rgba(255,214,32,0.12)",  text: "#FFD620", border: "rgba(255,214,32,0.25)"  },
  pro:     { bg: "rgba(225,154,62,0.12)",  text: "#E19A3E", border: "rgba(225,154,62,0.25)"  },
  riser:   { bg: "rgba(91,141,239,0.12)",  text: "#5B8DEF", border: "rgba(91,141,239,0.25)"  },
  starter: { bg: "rgba(156,164,183,0.12)", text: "#9CA4B7", border: "rgba(156,164,183,0.25)" },
};

const REFERRAL_CODE_STYLE = { bg: "rgba(255,255,255,0.04)", text: "rgba(255,255,255,0.55)" };

// ── Icons ─────────────────────────────────────────────────────────────────────


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
      className="inline-block rounded-[var(--space-1)] border px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium capitalize"
      style={{ background: style.bg, color: style.text, borderColor: style.border }}
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

function StatusCell({ status }: { status: "active" | "pending" | "rejected" | "mou_pending" }) {
  if (status === "active") {
    return (
      <span
        className="inline-block rounded-[var(--space-1)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
        style={{ background: "rgba(34,197,94,0.10)", color: "rgba(34,197,94,0.75)" }}
      >
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
  if (status === "mou_pending") {
    // Distinct amber so the admin can tell at a glance which rows are
    // waiting on the applicant's BoldSign signature vs. waiting on review.
    return (
      <span
        className="inline-block whitespace-nowrap rounded-[var(--space-1)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
        style={{ background: "rgba(245,158,11,0.14)", color: "#F59E0B" }}
      >
        MOU pending
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
      className="flex items-center justify-center text-[rgba(255,255,255,0.35)] transition-colors hover:text-[rgba(255,255,255,0.70)]"
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
  const [selectedAffiliate, setSelectedAffiliate] = useState<Affiliate | null>(null);
  const [editingAffiliate, setEditingAffiliate] = useState<Affiliate | null>(null);
  const [editCode, setEditCode] = useState("");
  const [moreMenuAffiliate, setMoreMenuAffiliate] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<{ id: string; name: string; requestedCode: string } | null>(null);
  const [approveCode, setApproveCode] = useState("");
  const [postApprovalCode, setPostApprovalCode] = useState<string | null>(null);

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

  // Inline edit of an active marketing partner's referral code. Resets the
  // codeStatus to unverified so the admin still has to click Verify Code to
  // push the new code into Luma.
  const editCodeMutation = useMutation<
    { id: string; referralCode: string; codeStatus: string; unchanged: boolean },
    Error,
    { affiliateId: string; referralCode: string }
  >({
    mutationFn: ({ affiliateId, referralCode }) =>
      apiClient(`/affiliates/${affiliateId}/referral-code`, {
        method: "PATCH",
        body: { referralCode },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliates"] });
      setEditingAffiliate(null);
    },
  });

  const [verifyResult, setVerifyResult] = useState<
    | { kind: "ok"; message: string }
    | { kind: "warn"; message: string }
    | { kind: "error"; message: string }
    | null
  >(null);

  const verifyCodeMutation = useMutation<
    { success?: boolean; codeStatus?: string; syncStatus?: string; error?: string | null },
    Error,
    string
  >({
    mutationFn: (affiliateId: string) =>
      apiClient(`/affiliates/${affiliateId}/verify-code`, {
        method: "PATCH",
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["affiliates"] });
      setPostApprovalCode(null);
      if (data?.codeStatus === "verified") {
        setVerifyResult({ kind: "ok", message: "Coupon verified in Luma." });
      } else if (data?.syncStatus === "skipped") {
        setVerifyResult({ kind: "warn", message: "Skipped — campaign has no Luma event linked." });
      } else {
        setVerifyResult({ kind: "warn", message: data?.error ?? "Sync did not complete." });
      }
      window.setTimeout(() => setVerifyResult(null), 6000);
    },
    onError: (err) => {
      setVerifyResult({ kind: "error", message: err.message || "Verify failed." });
      window.setTimeout(() => setVerifyResult(null), 8000);
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

  // Close more-menu when clicking outside
  const handlePageClick = () => { if (moreMenuAffiliate) setMoreMenuAffiliate(null); };

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        {/* Page header */}
        <div>
          <h2 className="font-[var(--font-display)] text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
            Marketing Partner Management
          </h2>
          <p className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
            Manage and monitor all marketing partners
          </p>
        </div>

        {/* Search + Filters */}
        {/* Search lives in AdminHeader (top-right) — wired to the same ?search
            URL param. Page bar only owns the contextual filters. */}
        <div className="flex items-center justify-end gap-[var(--space-3)]">
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
        <div className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent" onClick={handlePageClick}>
          <div className="overflow-x-auto px-[var(--space-6)] py-[var(--space-5)]">
            <table className="w-full border-collapse font-[var(--font-sans)]" aria-label="Marketing partners">
              <thead>
                <tr>
                  {["Name", "Referral Code", "Tier", "Referrals", "Revenue", "Status", "Actions"].map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="pb-[var(--space-3)] text-left text-[var(--text-xs)] leading-[var(--leading-caption)] tracking-[var(--tracking-caption)] uppercase font-semibold whitespace-nowrap pr-[var(--space-4)] last:pr-0 text-[rgba(255,255,255,0.38)]"
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
                  <tr key={aff.id} className="border-t transition-colors duration-150 hover:bg-[rgba(255,255,255,0.03)]" style={{ borderColor: "rgba(255,255,255,0.04)", background: "linear-gradient(180deg, rgba(255,255,255,0.015), transparent)" }}>
                    {/* Name + email — clickable, opens the detail drawer
                        with the full application responses for this row. */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setSelectedAffiliate(aff)}
                        className="group flex items-center gap-[var(--space-3)] rounded-[var(--radius-sm)] text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)]"
                        aria-label={`View ${aff.name}'s application responses`}
                      >
                        <Avatar initials={initials} />
                        <div>
                          <p className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] underline-offset-4 group-hover:underline">
                            {aff.name}
                          </p>
                          <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.45)]">
                            {aff.email}
                          </p>
                        </div>
                      </button>
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
                    {/* Status */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] whitespace-nowrap">
                      <StatusCell status={aff.status === "approved" ? "active" : aff.status} />
                    </td>
                    {/* mou_pending falls through StatusCell which renders
                        the amber "MOU pending" badge. No Approve/Reject
                        actions for that state — the applicant is the next
                        actor (BoldSign). */}
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
                        {aff.status === "approved" && (
                          <ActionButton label="Edit" onClick={() => { setEditingAffiliate(aff); setEditCode(aff.referralCode ?? ""); }}><IconEdit /></ActionButton>
                        )}
                        {aff.status === "approved" && (
                          <div className="relative" onClick={(e) => e.stopPropagation()}>
                            <ActionButton label="More" onClick={() => setMoreMenuAffiliate(moreMenuAffiliate === aff.id ? null : aff.id)}><IconMore /></ActionButton>
                            {moreMenuAffiliate === aff.id && (
                              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-30 min-w-[11rem] overflow-hidden rounded-[0.5rem] border border-[rgba(255,255,255,0.10)] bg-[#1c2035] shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
                                <button
                                  type="button"
                                  disabled={verifyCodeMutation.isPending}
                                  onClick={() => { verifyCodeMutation.mutate(aff.id); setMoreMenuAffiliate(null); }}
                                  className="flex w-full items-center gap-[0.5rem] px-[0.85rem] py-[0.55rem] text-left font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.06)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 7l3 3 5-5" /></svg>
                                  {verifyCodeMutation.isPending ? "Syncing..." : "Verify Code"}
                                </button>
                                <div className="mx-[0.5rem] h-px bg-[rgba(255,255,255,0.06)]" />
                                <button
                                  type="button"
                                  onClick={() => { setSelectedAffiliate(aff); setMoreMenuAffiliate(null); }}
                                  className="flex w-full items-center gap-[0.5rem] px-[0.85rem] py-[0.55rem] text-left font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                                >
                                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 7s2.5-4.5 6-4.5S13 7 13 7s-2.5 4.5-6 4.5S1 7 1 7z" /><circle cx="7" cy="7" r="1.8" /></svg>
                                  View Details
                                </button>
                              </div>
                            )}
                          </div>
                        )}
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
                Showing {startItem}-{endItem} of {total} marketing partners
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

      {/* Affiliate Detail Drawer */}
      <AffiliateDetailDrawer
        affiliate={selectedAffiliate}
        onClose={() => setSelectedAffiliate(null)}
      />

      {/* Edit affiliate modal */}
      {editingAffiliate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.60)]" onClick={() => setEditingAffiliate(null)}>
          <div className="w-full max-w-[26rem] rounded-[0.75rem] border border-[rgba(255,255,255,0.08)] bg-[#111525] px-[2rem] py-[1.75rem]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-[var(--font-display)] text-[var(--text-xl)] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
                Edit Marketing Partner
              </h2>
              <button
                type="button"
                onClick={() => setEditingAffiliate(null)}
                className="text-[rgba(255,255,255,0.40)] transition-colors hover:text-[var(--color-text-primary)]"
                aria-label="Close"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l10 10M14 4L4 14" /></svg>
              </button>
            </div>

            <div className="mt-[1rem] flex items-center gap-[0.75rem]">
              <div className="flex size-[2.5rem] shrink-0 items-center justify-center rounded-full bg-[var(--color-primary)]">
                <span className="font-[var(--font-sans)] text-[0.7rem] font-semibold text-white">
                  {editingAffiliate.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)]">{editingAffiliate.name}</p>
                <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.50)]">{editingAffiliate.email}</p>
              </div>
            </div>

            <div className="mt-[1.25rem] flex flex-col gap-[0.4rem]">
              <label className="font-[var(--font-sans)] text-[var(--text-xs)] uppercase tracking-[0.08em] font-semibold text-[rgba(255,255,255,0.50)]">
                Referral Code
              </label>
              <input
                type="text"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                maxLength={20}
                className="h-[2.75rem] w-full rounded-[var(--radius)] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] px-[var(--space-4)] font-mono text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.30)] focus:border-[var(--color-ring)] focus:outline-none"
              />
              <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.40)]">
                Current: {editingAffiliate.referralCode ?? "—"}
              </p>
              <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.40)]">
                Saving resets the Luma sync — re-run Verify Code from the partner&apos;s More menu after changing.
              </p>
              {editCodeMutation.isError && (
                <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[#FCA5A5]">
                  {editCodeMutation.error?.message ?? "Failed to update code"}
                </p>
              )}
            </div>

            <div className="mt-[1.25rem] flex gap-[var(--space-3)]">
              <button
                type="button"
                onClick={() => setEditingAffiliate(null)}
                className="flex-1 rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !editCode ||
                  editCode.length < 3 ||
                  editCode === editingAffiliate.referralCode ||
                  editCodeMutation.isPending
                }
                onClick={() =>
                  editCodeMutation.mutate({
                    affiliateId: editingAffiliate.id,
                    referralCode: editCode,
                  })
                }
                className="flex-1 rounded-[var(--radius)] bg-[var(--color-primary)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
              >
                {editCodeMutation.isPending ? "Saving…" : "Save"}
              </button>
            </div>
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

      {/* Post-approval: confirmation. The Luma coupon is created automatically
          by the backend after the affiliate signs the MOU (syncCouponToLuma in
          activateAffiliateFromMou). If sync fails the admin can retry from
          the affiliate's More → Verify Code action. */}
      {postApprovalCode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(0,0,0,0.60)]" onClick={() => setPostApprovalCode(null)}>
          <div className="w-full max-w-[28rem] rounded-[0.75rem] border border-[rgba(34,197,94,0.20)] bg-[#111525] px-[2rem] py-[1.75rem]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-[0.5rem]">
              <span className="flex size-[1.5rem] items-center justify-center rounded-full bg-[rgba(34,197,94,0.15)]">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7l3 3 5-5" /></svg>
              </span>
              <h2 className="font-[var(--font-display)] text-[var(--text-xl)] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
                Application Approved
              </h2>
            </div>

            <p className="mt-[0.75rem] font-[var(--font-sans)] text-[var(--text-sm)] leading-[1.4rem] text-[rgba(255,255,255,0.65)]">
              The applicant will receive an MOU email. Once they sign it, their referral coupon{" "}
              <code className="rounded-[0.25rem] bg-[rgba(0,0,0,0.30)] px-[0.4rem] py-[0.05rem] font-mono text-[#22C55E]">
                {postApprovalCode}
              </code>
              {" "}will be created in Luma automatically.
            </p>
            <p className="mt-[0.75rem] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.40)]">
              If auto-sync fails, retry from the partner&apos;s More → Verify Code menu.
            </p>

            <div className="mt-[1.5rem] flex">
              <button
                type="button"
                onClick={() => setPostApprovalCode(null)}
                className="ml-auto rounded-[var(--radius)] bg-[#22C55E] px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-white transition-colors hover:bg-[#16A34A]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verify-code result toast — bottom-right, auto-dismissing. */}
      {verifyResult && (
        <div
          role="status"
          className={`fixed bottom-[var(--space-6)] right-[var(--space-6)] z-50 max-w-[24rem] rounded-[var(--radius)] border px-[var(--space-4)] py-[var(--space-3)] font-[var(--font-sans)] text-[var(--text-sm)] shadow-[0_8px_24px_rgba(0,0,0,0.45)] ${
            verifyResult.kind === "ok"
              ? "border-[rgba(34,197,94,0.30)] bg-[rgba(34,197,94,0.10)] text-[#86EFAC]"
              : verifyResult.kind === "warn"
                ? "border-[rgba(234,179,8,0.30)] bg-[rgba(234,179,8,0.10)] text-[#FDE68A]"
                : "border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.10)] text-[#FCA5A5]"
          }`}
        >
          {verifyResult.message}
        </div>
      )}
    </DashboardStageCanvas>
  );
}
