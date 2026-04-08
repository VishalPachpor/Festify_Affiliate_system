"use client";

import { useState } from "react";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";

// ── Mock data ─────────────────────────────────────────────────────────────────

type AffiliateRow = {
  id: string;
  initials: string;
  avatarColor: string;
  name: string;
  email: string;
  referralCode: string;
  tier: "platinum" | "gold" | "silver" | "bronze" | "none";
  referrals: number | null;
  revenue: number | null;
  commissionDue: number | null;
  status: "active" | "pending" | "rejected";
};

const ALL_AFFILIATES: AffiliateRow[] = [
  { id: "1", initials: "SC", avatarColor: "#C4A24D", name: "Sarah Chen", email: "sarah.chen@email.com", referralCode: "SARAH2049", tier: "platinum", referrals: 87, revenue: 43500, commissionDue: 4350, status: "active" },
  { id: "2", initials: "MW", avatarColor: "#C4A24D", name: "Michael Wong", email: "michael.wong@email.com", referralCode: "MWONG2049", tier: "gold", referrals: 64, revenue: 32000, commissionDue: 3200, status: "active" },
  { id: "3", initials: "MW", avatarColor: "#C4A24D", name: "Emily Rodriguez", email: "emily.r@email.com", referralCode: "EMILY2049", tier: "gold", referrals: 52, revenue: 26000, commissionDue: 2600, status: "active" },
  { id: "4", initials: "DK", avatarColor: "#C4A24D", name: "David Kim", email: "david.kim@email.com", referralCode: "DKIM2049", tier: "silver", referrals: 41, revenue: 20500, commissionDue: 2050, status: "active" },
  { id: "5", initials: "LT", avatarColor: "#C4A24D", name: "Lisa Tan", email: "lisa.tan@email.com", referralCode: "LTAN2049", tier: "none", referrals: null, revenue: null, commissionDue: null, status: "pending" },
  { id: "6", initials: "LT", avatarColor: "#C4A24D", name: "James Wilson", email: "james.w@email.com", referralCode: "JWILSON49", tier: "bronze", referrals: 12, revenue: 6000, commissionDue: 600, status: "active" },
  { id: "7", initials: "AP", avatarColor: "#C4A24D", name: "Ana Patel", email: "ana.patel@email.com", referralCode: "APATEL49", tier: "silver", referrals: 38, revenue: 19000, commissionDue: 1900, status: "active" },
  { id: "8", initials: "RJ", avatarColor: "#C4A24D", name: "Ryan Jones", email: "ryan.j@email.com", referralCode: "RJONES49", tier: "gold", referrals: 55, revenue: 27500, commissionDue: 2750, status: "active" },
  { id: "9", initials: "KL", avatarColor: "#C4A24D", name: "Karen Lee", email: "karen.lee@email.com", referralCode: "KLEE2049", tier: "none", referrals: null, revenue: null, commissionDue: null, status: "pending" },
  { id: "10", initials: "TM", avatarColor: "#C4A24D", name: "Tom Martinez", email: "tom.m@email.com", referralCode: "TMART49", tier: "bronze", referrals: 8, revenue: 4000, commissionDue: 400, status: "active" },
  { id: "11", initials: "NW", avatarColor: "#C4A24D", name: "Nina White", email: "nina.w@email.com", referralCode: "NWHITE49", tier: "silver", referrals: 29, revenue: 14500, commissionDue: 1450, status: "active" },
  { id: "12", initials: "JB", avatarColor: "#C4A24D", name: "Jake Brown", email: "jake.b@email.com", referralCode: "JBROWN49", tier: "none", referrals: null, revenue: null, commissionDue: null, status: "rejected" },
];

const TOTAL_AFFILIATES = 247;
const PAGE_SIZE = 6;

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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
      className="inline-block rounded-[0.25rem] px-[0.5rem] py-[0.1rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
      style={{ background: style.bg, color: style.text }}
    >
      {tier}
    </span>
  );
}

function ReferralCodeBadge({ code }: { code: string }) {
  return (
    <span
      className="inline-block rounded-[0.25rem] px-[0.45rem] py-[0.1rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
      style={{ background: REFERRAL_CODE_STYLE.bg, color: REFERRAL_CODE_STYLE.text }}
    >
      {code}
    </span>
  );
}

function StatusCell({ status }: { status: AffiliateRow["status"] }) {
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
        className="inline-block rounded-[0.25rem] px-[0.5rem] py-[0.1rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
        style={{ background: "rgba(234,179,8,0.14)", color: "#EAB308" }}
      >
        pending
      </span>
    );
  }
  return (
    <span
      className="inline-block rounded-[0.25rem] px-[0.5rem] py-[0.1rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
      style={{ background: "rgba(239,68,68,0.14)", color: "#EF4444" }}
    >
      rejected
    </span>
  );
}

function ActionButton({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex items-center justify-center text-[rgba(255,255,255,0.40)] transition-colors hover:text-[rgba(255,255,255,0.80)]"
    >
      {children}
    </button>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AdminAffiliatesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter
  let filtered = ALL_AFFILIATES;
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      (a) => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.referralCode.toLowerCase().includes(q),
    );
  }
  if (statusFilter !== "all") {
    filtered = filtered.filter((a) => a.status === statusFilter);
  }
  if (tierFilter !== "all") {
    filtered = filtered.filter((a) => a.tier === tierFilter);
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, filtered.length);

  // Page numbers
  const pageNumbers: number[] = [];
  const maxBtns = 3;
  let sp = Math.max(1, currentPage - 1);
  const ep = Math.min(totalPages, sp + maxBtns - 1);
  if (ep - sp < maxBtns - 1) sp = Math.max(1, ep - maxBtns + 1);
  for (let i = sp; i <= ep; i++) pageNumbers.push(i);

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-[var(--font-display)] text-[1.75rem] font-bold leading-none tracking-[-0.03em] text-[var(--color-text-primary)]">
              Affiliate Management
            </h2>
            <p className="mt-[0.3rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
              Manage and monitor all affiliates
            </p>
          </div>
          <button
            type="button"
            className="flex items-center gap-[0.5rem] rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-5)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
          >
            <IconInvite />
            Invite Affiliate
          </button>
        </div>

        {/* Search + Filters */}
        <div className="flex items-center gap-[var(--space-3)]">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-[var(--space-3)] top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.40)]">
              <IconSearch />
            </span>
            <input
              type="search"
              placeholder="Search affiliates..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="h-[2.5rem] w-full rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] pl-[2.2rem] pr-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.35)] focus:border-[var(--color-ring)] focus:outline-none transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => { setStatusFilter(statusFilter === "all" ? "active" : statusFilter === "active" ? "pending" : "all"); setCurrentPage(1); }}
            className="flex items-center gap-[0.4rem] rounded-[var(--radius)] bg-[rgba(255,255,255,0.06)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.10)]"
          >
            {statusFilter === "all" ? "All status" : statusFilter}
            <IconChevronDown />
          </button>
          <button
            type="button"
            onClick={() => { setTierFilter(tierFilter === "all" ? "platinum" : tierFilter === "platinum" ? "gold" : tierFilter === "gold" ? "silver" : "all"); setCurrentPage(1); }}
            className="flex items-center gap-[0.4rem] rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)]"
          >
            {tierFilter === "all" ? "All tiers" : tierFilter}
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
                {paged.map((aff) => (
                  <tr key={aff.id} className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {/* Name + email */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] whitespace-nowrap">
                      <div className="flex items-center gap-[0.65rem]">
                        <Avatar initials={aff.initials} color={aff.avatarColor} />
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
                      <ReferralCodeBadge code={aff.referralCode} />
                    </td>
                    {/* Tier */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] whitespace-nowrap">
                      <TierBadge tier={aff.tier} />
                    </td>
                    {/* Referrals */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] text-center whitespace-nowrap text-[rgba(255,255,255,0.60)]">
                      {aff.referrals ?? "--"}
                    </td>
                    {/* Revenue */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] whitespace-nowrap text-[#FFFFFF]">
                      {aff.revenue != null ? formatCurrency(aff.revenue) : "--"}
                    </td>
                    {/* Commission Due */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] whitespace-nowrap text-[#22C55E]">
                      {aff.commissionDue != null ? formatCurrency(aff.commissionDue) : "--"}
                    </td>
                    {/* Status */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] whitespace-nowrap">
                      <StatusCell status={aff.status} />
                    </td>
                    {/* Actions */}
                    <td className="py-[var(--space-3)] whitespace-nowrap">
                      <div className="flex items-center gap-[0.5rem]">
                        <ActionButton label="View"><IconView /></ActionButton>
                        {aff.status === "pending" && (
                          <>
                            <ActionButton label="Approve"><IconApprove /></ActionButton>
                            <ActionButton label="Reject"><IconReject /></ActionButton>
                          </>
                        )}
                        <ActionButton label="Edit"><IconEdit /></ActionButton>
                        <ActionButton label="More"><IconMore /></ActionButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex items-center justify-between border-t px-[var(--space-6)] py-[var(--space-4)]" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.45)]">
                Showing {startItem}-{endItem} of {TOTAL_AFFILIATES} affiliates
              </p>
              <div className="flex gap-[var(--space-2)]">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.60)] transition-colors hover:border-[rgba(255,255,255,0.20)] hover:text-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-40"
                >
                  Previous
                </button>
                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setCurrentPage(num)}
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
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.60)] transition-colors hover:border-[rgba(255,255,255,0.20)] hover:text-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </DashboardContainer>
    </DashboardStageCanvas>
  );
}
