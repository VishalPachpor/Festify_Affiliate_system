"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import { useTenant } from "@/modules/tenant-shell";
import { usePayoutSummary } from "@/modules/payouts/hooks/use-payout-summary";
import { useSalesSummary } from "@/modules/sales/hooks/use-sales-summary";
import { useSalesList } from "@/modules/sales/hooks/use-sales-list";
import { useSalesFilters } from "@/modules/sales/hooks/use-sales-filters";
import { apiClient } from "@/services/api/client";
import type { Sale } from "@/modules/sales/types";

type CommissionStatus = "paid" | "approved" | "pending";

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCurrency(minorUnits: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

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

function IconDownload() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M7 2v7M7 9l2.5-2.5M7 9L4.5 6.5" />
      <path d="M2 9.5v1.5a1.5 1.5 0 001.5 1.5h7A1.5 1.5 0 0012 11V9.5" />
    </svg>
  );
}

// ── Status cell ───────────────────────────────────────────────────────────────

function StatusCell({ status }: { status: CommissionStatus }) {
  if (status === "paid") {
    return (
      <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
        paid
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="font-[var(--font-sans)] text-[var(--text-sm)] text-[rgba(255,255,255,0.50)]">
        approved
      </span>
    );
  }
  return (
    <span
      className="inline-block rounded-[var(--space-1)] px-[var(--space-2)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
      style={{ background: "rgba(234,179,8,0.14)", color: "#EAB308" }}
    >
      pending
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
//
// Figma 101:6633/6645/6657: 362×106, 24px padding, 16px gap between label
// and value. Outstanding uses the info/link blue (#A6D1FF) as its label
// accent to flag it as the actionable metric; the other two sit muted.

function KpiCard({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  return (
    <div className="flex flex-col gap-[var(--space-4)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent px-[var(--space-6)] py-[var(--space-6)]">
      <dt
        className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] tracking-[var(--tracking-caption)] uppercase font-semibold"
        style={{ color: accentColor }}
      >
        {label}
      </dt>
      <dd className="font-[var(--font-display)] font-bold text-[2rem] leading-[1.1] tracking-[var(--tracking-heading)] text-[#FFFFFF]">
        {value}
      </dd>
    </div>
  );
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportToCsv(sales: Sale[]) {
  const headers = ["Affiliate", "Total Sales", "Commission", "Status", "Date"];
  const rows = sales.map((row) => [
    row.affiliateName,
    (row.amount / 100).toFixed(2),
    (row.commission / 100).toFixed(2),
    toCommissionStatus(row.status),
    row.createdAt,
  ]);

  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `commissions-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Page ───────────────────────────────────────────────────────────────────────

// Thin pass-through: backend is the source of truth for commission status.
// "confirmed" is kept as a legacy alias — treat it as "approved".
function toCommissionStatus(s: Sale["status"]): CommissionStatus {
  if (s === "paid") return "paid";
  if (s === "approved" || s === "confirmed") return "approved";
  return "pending";
}

const STATUS_OPTIONS = [
  { label: "All status", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Confirmed", value: "confirmed" },
  { label: "Paid", value: "paid" },
] as const;

const PAGE_SIZE = 10;

export default function AdminCommissionsPage() {
  const queryClient = useQueryClient();
  const { tenant } = useTenant();
  const { filters, setFilters } = useSalesFilters();
  const [statusFilter, setStatusFilter] = useState("");
  const [payingSaleId, setPayingSaleId] = useState<string | null>(null);

  const { data: salesData } = useSalesList(tenant?.id, {
    ...filters,
    status: statusFilter as Sale["status"] || undefined,
    pageSize: PAGE_SIZE,
  });
  const { data: payoutData } = usePayoutSummary(tenant?.id);
  const { data: salesSummary } = useSalesSummary(tenant?.id);

  const sales: Sale[] = salesData?.sales ?? [];
  const total = salesData?.total ?? 0;
  const totalPages = salesData?.totalPages ?? 1;
  const currentPage = filters.page;

  // Total Earned = all commissions from the ledger (via sales summary)
  // Total Paid = all payouts (paid + pending + processing — money allocated)
  // Outstanding = earned minus paid
  const totalEarned = salesSummary?.totalCommissions ?? 0;
  const totalPaid = (payoutData?.totalPaid ?? 0) +
    (payoutData?.totalPending ?? 0) +
    (payoutData?.totalProcessing ?? 0);
  const outstanding = totalEarned - totalPaid;

  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, total);

  // Mark Paid → /payouts/create with markAsPaid=true.
  // Backend flips sale.status to paid inside the same transaction.
  const markPaidMutation = useMutation({
    mutationFn: ({ affiliateId, saleId }: { affiliateId: string; saleId: string }) =>
      apiClient<{ id: string }>("/payouts/create", {
        method: "POST",
        body: { affiliateId, saleId, markAsPaid: true },
      }),
    onSuccess: () => {
      setPayingSaleId(null);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => {
      setPayingSaleId(null);
    },
  });

  // Approve → /sales/:id/approve. Backend mutates sale.status to approved,
  // creates a pending payout, and links the earned ledger entries to it.
  const approveMutation = useMutation({
    mutationFn: (saleId: string) =>
      apiClient<{ id: string; status: string }>(`/sales/${saleId}/approve`, {
        method: "POST",
      }),
    onSuccess: () => {
      setPayingSaleId(null);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: () => {
      setPayingSaleId(null);
    },
  });

  // Generate page numbers
  const pageNumbers: number[] = [];
  const maxPageButtons = 5;
  let startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  if (endPage - startPage < maxPageButtons - 1) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <DashboardStageCanvas>
      <div className="flex flex-col gap-[var(--space-6)] px-[var(--space-8)] py-[var(--space-8)]">
        {/* KPI Summary */}
        <dl className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-3">
          <KpiCard
            label="Total Earned"
            value={formatCurrency(totalEarned)}
            accentColor="rgba(255,255,255,0.50)"
          />
          <KpiCard
            label="Total Paid"
            value={formatCurrency(totalPaid)}
            accentColor="rgba(255,255,255,0.50)"
          />
          <KpiCard
            label="Outstanding"
            value={formatCurrency(outstanding)}
            accentColor="#A6D1FF"
          />
        </dl>

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
              onChange={(e) => setFilters({ search: e.target.value || undefined })}
              className="h-[2.5rem] w-full rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] pl-[2.2rem] pr-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] placeholder:text-[rgba(255,255,255,0.35)] focus:border-[var(--color-ring)] focus:outline-none transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setFilters({ page: 1 });
              }}
              className="h-[2.5rem] appearance-none rounded-[var(--radius)] bg-[rgba(255,255,255,0.06)] pl-[var(--space-4)] pr-[2.5rem] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.10)] border-none focus:outline-none cursor-pointer"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#1a1e2e] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-[var(--space-3)] top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.40)]">
              <IconChevronDown />
            </span>
          </div>
          <button
            type="button"
            onClick={() => exportToCsv(sales)}
            disabled={sales.length === 0}
            className="flex items-center gap-[var(--space-2)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)] disabled:opacity-40"
          >
            <IconDownload />
            Export CSV
          </button>
        </div>

        {/* Mutation feedback — surfaces errors from either action */}
        {(markPaidMutation.isError || approveMutation.isError) && (
          <div className="rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FCA5A5]">
            {(markPaidMutation.error instanceof Error && markPaidMutation.error.message) ||
              (approveMutation.error instanceof Error && approveMutation.error.message) ||
              "Action failed"}
          </div>
        )}

        {/* Table */}
        <div className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent">
          <div className="overflow-x-auto px-[var(--space-6)] py-[var(--space-5)]">
            <table className="w-full border-collapse font-[var(--font-sans)]" aria-label="Commissions">
              <thead>
                <tr>
                  {["Affiliate", "Total Sales", "Commission", "Status", "Paid", "Outstanding", "Payout Date", "Actions"].map((col) => (
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
                {sales.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-[var(--space-8)] text-center text-[var(--text-sm)] text-[rgba(255,255,255,0.45)]">
                      No commissions found.
                    </td>
                  </tr>
                )}
                {sales.map((row) => {
                  const cStatus = toCommissionStatus(row.status);
                  const isPaid = row.status === "paid";
                  const paidAmount = isPaid ? row.commission : 0;
                  const outstandingAmount = isPaid ? 0 : row.commission;
                  // Figma 101:9184 "Payout Date" — empty em-dash for pending rows;
                  // for paid/approved we surface the sale's createdAt as the stand-in
                  // until a dedicated payout date field is available.
                  // Use the real payout processedAt when the backend has one,
                  // otherwise fall back to an em-dash. Pending rows never have one.
                  const payoutDate =
                    row.payoutDate
                      ? new Date(row.payoutDate).toISOString().slice(0, 10)
                      : "—";
                  return (
                  <tr key={row.id} className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                      {row.affiliateName}
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] text-[#FFFFFF] whitespace-nowrap">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] text-[#F5A623] whitespace-nowrap">
                      {formatCurrency(row.commission)}
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] whitespace-nowrap">
                      <StatusCell status={cStatus} />
                    </td>
                    <td
                      className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] whitespace-nowrap"
                      style={{ color: paidAmount > 0 ? "#22C55E" : "rgba(255,255,255,0.35)" }}
                    >
                      {formatCurrency(paidAmount)}
                    </td>
                    <td
                      className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] whitespace-nowrap"
                      style={{ color: outstandingAmount > 0 ? "#22C55E" : "rgba(255,255,255,0.35)" }}
                    >
                      {formatCurrency(outstandingAmount)}
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] text-[rgba(255,255,255,0.55)] whitespace-nowrap">
                      {payoutDate}
                    </td>
                    <td className="py-[var(--space-3)] whitespace-nowrap">
                      {cStatus === "approved" && row.affiliateId && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingSaleId(row.id);
                            markPaidMutation.mutate({
                              affiliateId: row.affiliateId,
                              saleId: row.id,
                            });
                          }}
                          disabled={payingSaleId !== null}
                          className="rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                        >
                          {payingSaleId === row.id ? "Processing..." : "Mark Paid"}
                        </button>
                      )}
                      {cStatus === "pending" && row.affiliateId && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingSaleId(row.id);
                            approveMutation.mutate(row.id);
                          }}
                          disabled={payingSaleId !== null}
                          className="rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-4)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-50"
                        >
                          {payingSaleId === row.id ? "Approving..." : "Approve"}
                        </button>
                      )}
                      {cStatus === "pending" && !row.affiliateId && (
                        // Unattributed sales can't be approved inline — they need
                        // an AttributionClaim first, which happens in the
                        // Unattributed Sales panel.
                        <button
                          type="button"
                          disabled
                          title="Unattributed — assign an affiliate in the Unattributed Sales panel first"
                          className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-4)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[rgba(255,255,255,0.50)] disabled:cursor-not-allowed"
                        >
                          Attribute first
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-[var(--space-6)] py-[var(--space-4)]" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.45)]">
              {total > 0
                ? `Showing ${startItem}-${endItem} of ${total} entries`
                : "No entries"}
            </p>
            <div className="flex gap-[var(--space-2)]">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setFilters({ page: currentPage - 1 })}
                className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.78)] transition-colors hover:border-[rgba(255,255,255,0.18)] disabled:pointer-events-none disabled:opacity-40"
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
                      : "border-[rgba(255,255,255,0.08)] bg-transparent text-[rgba(255,255,255,0.78)] hover:border-[rgba(255,255,255,0.18)]",
                  ].join(" ")}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setFilters({ page: currentPage + 1 })}
                className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.78)] transition-colors hover:border-[rgba(255,255,255,0.18)] disabled:pointer-events-none disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </DashboardStageCanvas>
  );
}
