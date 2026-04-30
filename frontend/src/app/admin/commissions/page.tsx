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

type CommissionStatus = "paid" | "approved" | "pending" | "processing" | "failed" | "refunded";

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCurrency(minorUnits: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

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
  // Figma 101:9195/9218/9258: pill, 22.66px tall, 4px radius, 11px Medium,
  // paid+approved share a green tint; pending uses amber.
  const base =
    "inline-block rounded-[4px] px-[8px] py-[3px] font-[var(--font-sans)] text-[11px] font-medium leading-[14.667px]";
  if (status === "paid" || status === "approved") {
    return (
      <span className={base} style={{ background: "rgba(34,197,94,0.2)", color: "#f0f0f0" }}>
        {status}
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className={base} style={{ background: "rgba(91,141,239,0.2)", color: "#A6D1FF" }}>
        processing
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={base} style={{ background: "rgba(239,68,68,0.2)", color: "#FCA5A5" }}>
        failed
      </span>
    );
  }
  if (status === "refunded") {
    return (
      <span className={base} style={{ background: "rgba(156,163,175,0.18)", color: "#cbd5e1" }}>
        refunded
      </span>
    );
  }
  return (
    <span className={base} style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b" }}>
      pending
    </span>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
//
// Figma 101:6633/6645/6657: 362×106, 24px padding, 16px gap between label
// and value. Outstanding uses the info/link blue (#A6D1FF) as its label
// accent to flag it as the actionable metric; the other two sit muted.

function KpiCard({
  label,
  value,
  accentColor,
  badge,
}: {
  label: string;
  value: string;
  accentColor: string;
  badge?: { text: string; tone: "warning" | "info" };
}) {
  const badgeColor =
    badge?.tone === "warning"
      ? { background: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.30)", text: "#f59e0b" }
      : { background: "rgba(91,141,239,0.12)", border: "rgba(91,141,239,0.24)", text: "#A6D1FF" };
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
      {badge && (
        <span
          className="inline-flex w-fit items-center rounded-[4px] px-[var(--space-2)] py-[2px] font-[var(--font-sans)] text-[11px] font-medium leading-[14.667px]"
          style={{
            background: badgeColor.background,
            border: `1px solid ${badgeColor.border}`,
            color: badgeColor.text,
          }}
        >
          {badge.text}
        </span>
      )}
    </div>
  );
}

// ── CSV Export ────────────────────────────────────────────────────────────────

function exportToCsv(sales: Sale[]) {
  const headers = ["Marketing Partner", "Total Sales", "Commission", "Status", "Date"];
  const rows = sales.map((row) => [
    row.affiliateName,
    (row.amount / 100).toFixed(2),
    (row.commission / 100).toFixed(2),
    deriveCommissionStatus(row),
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

function deriveCommissionStatus(row: Sale): CommissionStatus {
  // payoutStatus="paid" stays at "paid" even when the underlying sale is
  // refunded — that's the post-paid-refund state where the Reverse Payout
  // (clawback) action surfaces. Other payoutStatus values lose priority to
  // the refund signal so the row doesn't misleadingly render as "pending"
  // and offer an Approve button against a sale that can't be approved.
  if (row.payoutStatus === "paid") return "paid";
  if (row.status === "refunded") return "refunded";
  if (row.payoutStatus === "processing") return "processing";
  if (row.payoutStatus === "failed") return "failed";
  if (row.payoutStatus === "pending") return "approved";
  return toCommissionStatus(row.status);
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
  // Date filter is URL-driven via the shared useSalesFilters hook so it
  // round-trips into /sales as ?from=&to= — the server paginates the filtered
  // set, and the footer/next-prev stay in sync with what's visible.
  const dateFilter = filters.from ?? "";

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
  // Total Paid = only payouts with status=paid (actual money out the door)
  // Outstanding = earned minus paid, floored at $0 in the display.
  // When the variance goes negative, it means we paid out for a sale that
  // was later refunded — the affiliate has effectively been overpaid.
  // We surface that as a "Clawback owed" badge on the Outstanding card and
  // give the admin a per-row "Reverse Payout" action below.
  const totalEarned = salesSummary?.totalCommissions ?? 0;
  const totalPaid = payoutData?.totalPaid ?? 0;
  const rawOutstanding = totalEarned - totalPaid;
  const outstanding = Math.max(0, rawOutstanding);
  const clawbackOwed = rawOutstanding < 0 ? Math.abs(rawOutstanding) : 0;

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
      // Clear stale errors from sibling actions on the same page.
      settlePendingPayoutMutation.reset();
      approveMutation.reset();
    },
    onError: () => {
      setPayingSaleId(null);
    },
  });

  const settlePendingPayoutMutation = useMutation({
    mutationFn: (payoutId: string) =>
      apiClient<{ id: string; status: string; processedAt: string | null }>(`/payouts/${payoutId}/status`, {
        method: "PATCH",
        body: { status: "paid" },
      }),
    onSuccess: () => {
      setPayingSaleId(null);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      markPaidMutation.reset();
      approveMutation.reset();
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
      markPaidMutation.reset();
      settlePendingPayoutMutation.reset();
    },
    onError: () => {
      setPayingSaleId(null);
    },
  });

  // Clawback → POST /payouts/:id/clawback. Use case: row.payoutStatus="paid"
  // AND row.status="refunded" — admin paid out, then the customer refunded
  // the underlying ticket. Backend unlinks the ledger entries and deletes
  // the Payout, bringing TOTAL PAID back into alignment with TOTAL EARNED.
  const clawbackMutation = useMutation({
    mutationFn: (payoutId: string) =>
      apiClient<{ id: string; clawedBack: boolean }>(`/payouts/${payoutId}/clawback`, {
        method: "POST",
      }),
    onSuccess: () => {
      setPayingSaleId(null);
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      markPaidMutation.reset();
      settlePendingPayoutMutation.reset();
      approveMutation.reset();
    },
    onError: () => {
      setPayingSaleId(null);
    },
  });

  const dismissMutationError = () => {
    markPaidMutation.reset();
    settlePendingPayoutMutation.reset();
    approveMutation.reset();
    clawbackMutation.reset();
  };

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
            badge={
              clawbackOwed > 0
                ? { text: `Clawback owed: ${formatCurrency(clawbackOwed)}`, tone: "warning" }
                : undefined
            }
          />
        </dl>

        {/* Active-filter chip — surfaces when the page is deep-linked from
            the affiliate drawer with ?affiliateId=... so the user understands
            why the list looks smaller. Clearing the chip drops back to the
            full tenant-wide view. */}
        {filters.affiliateId && (
          <div className="flex items-center gap-[var(--space-3)]">
            <span
              className="inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius)] px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)]"
              style={{
                background: "rgba(91,141,239,0.12)",
                border: "1px solid rgba(91,141,239,0.24)",
                color: "#A6D1FF",
              }}
            >
              <span className="font-semibold">Filtered:</span>
              <span>
                {sales[0]?.affiliateName && sales[0]?.affiliateId === filters.affiliateId
                  ? sales[0].affiliateName
                  : filters.affiliateId}
              </span>
              <button
                type="button"
                onClick={() => setFilters({ affiliateId: undefined, page: 1 })}
                aria-label="Clear marketing partner filter"
                className="ml-[var(--space-1)] transition-colors hover:text-white"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 3l8 8M11 3L3 11" />
                </svg>
              </button>
            </span>
          </div>
        )}

        {/* Filters — search lives in AdminHeader (top-right). */}
        <div className="flex items-center justify-end gap-[var(--space-3)]">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              const v = e.target.value || undefined;
              // from/to bracket a single day so server-side pagination filters
              // the set the footer/pager reflect — no client-side divergence.
              setFilters({ from: v, to: v, page: 1 });
            }}
            aria-label="Filter by date"
            className="h-[2.5rem] rounded-[var(--radius)] bg-[rgba(255,255,255,0.06)] px-[var(--space-4)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.10)] border-none focus:outline-none"
          />
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
        {(markPaidMutation.isError || settlePendingPayoutMutation.isError || approveMutation.isError || clawbackMutation.isError) && (
          <div className="flex items-center gap-[var(--space-3)] rounded-[var(--radius)] border border-[rgba(239,68,68,0.30)] bg-[rgba(239,68,68,0.08)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[#FCA5A5]">
            <span className="flex-1">
              {(markPaidMutation.error instanceof Error && markPaidMutation.error.message) ||
                (settlePendingPayoutMutation.error instanceof Error && settlePendingPayoutMutation.error.message) ||
                (approveMutation.error instanceof Error && approveMutation.error.message) ||
                (clawbackMutation.error instanceof Error && clawbackMutation.error.message) ||
                "Action failed"}
            </span>
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={dismissMutationError}
              className="rounded-[0.25rem] px-[0.5rem] py-[0.15rem] text-[#FCA5A5] transition-colors hover:bg-[rgba(239,68,68,0.15)]"
            >
              ×
            </button>
          </div>
        )}

        {/* Table */}
        <div className="rounded-[8px] border border-[rgba(255,255,255,0.05)] bg-[rgba(15,22,40,0.5)]">
          <div className="overflow-x-auto px-[var(--space-6)] py-[var(--space-5)]">
            <table className="w-full border-collapse font-[var(--font-sans)]" aria-label="Commissions">
              <thead>
                <tr>
                  {[
                    { label: "Marketing Partner", align: "left" as const },
                    { label: "Total Sales", align: "right" as const },
                    { label: "Commission", align: "right" as const },
                    { label: "Status", align: "center" as const },
                    { label: "Paid", align: "right" as const },
                    { label: "Outstanding", align: "right" as const },
                    { label: "Payout Date", align: "left" as const },
                    { label: "Actions", align: "center" as const },
                  ].map((col) => (
                    <th
                      key={col.label}
                      scope="col"
                      className="pb-[var(--space-3)] text-[12px] leading-[14px] tracking-[0.275px] uppercase whitespace-nowrap pr-[var(--space-4)] last:pr-0 text-[#b0b8cc]"
                      style={{ textAlign: col.align }}
                    >
                      {col.label}
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
                {sales.map((row, rowIndex) => {
                  const payoutSettled = row.payoutStatus === "paid";
                  const cStatus = deriveCommissionStatus(row);
                  const isPaid = payoutSettled || row.status === "paid";
                  const paidAmount = isPaid ? row.commission : 0;
                  const outstandingAmount = isPaid ? 0 : row.commission;
                  const isBundledPendingPayout =
                    row.payoutStatus === "pending" && (row.payoutSaleCount ?? 0) > 1;
                  // Show "Reverse Payout" when the payout was settled and the
                  // underlying sale was later refunded — that's the clawback
                  // case. We refuse mark-paid in that state and offer the
                  // reverse action instead.
                  const canClawback =
                    payoutSettled && !!row.payoutId && row.status === "refunded";
                  const canMarkPaid =
                    !!row.affiliateId &&
                    !isBundledPendingPayout &&
                    !canClawback &&
                    ((row.payoutStatus === "pending" && !!row.payoutId) ||
                      (cStatus === "approved" && row.payoutStatus == null));
                  // Figma 101:9187/9210: alternating rows get a 1% white fill.
                  const zebra = rowIndex % 2 === 0 ? "rgba(255,255,255,0.01)" : "transparent";
                  const payoutDate =
                    row.payoutDate
                      ? new Date(row.payoutDate).toISOString().slice(0, 10)
                      : "—";
                  return (
                  <tr
                    key={row.id}
                    className="border-t"
                    style={{ borderColor: "rgba(255,255,255,0.05)", background: zebra }}
                  >
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[14px] font-semibold text-white whitespace-nowrap">
                      {row.affiliateName}
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-right text-[16px] text-white whitespace-nowrap">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-right text-[16px] font-bold text-[#c9a84c] whitespace-nowrap">
                      {formatCurrency(row.commission)}
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-center whitespace-nowrap">
                      <StatusCell status={cStatus} />
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-right text-[16px] text-[#22c55e] whitespace-nowrap">
                      {formatCurrency(paidAmount)}
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-right text-[16px] text-[#f59e0b] whitespace-nowrap">
                      {formatCurrency(outstandingAmount)}
                    </td>
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[12px] text-[#b0b8cc] whitespace-nowrap">
                      {payoutDate}
                    </td>
                    <td className="py-[var(--space-3)] text-center whitespace-nowrap">
                      {canClawback && row.payoutId && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingSaleId(row.id);
                            clawbackMutation.mutate(row.payoutId!);
                          }}
                          disabled={payingSaleId !== null}
                          title="The underlying sale was refunded after the payout was marked paid. Reversing brings TOTAL PAID back into alignment."
                          className="rounded-[8px] border border-[rgba(245,158,11,0.40)] bg-[rgba(245,158,11,0.10)] px-[16px] py-[8px] font-[var(--font-sans)] text-[12px] leading-[18px] text-[#f59e0b] transition-colors hover:bg-[rgba(245,158,11,0.18)] disabled:opacity-50"
                        >
                          {payingSaleId === row.id ? "Reversing..." : "Reverse Payout"}
                        </button>
                      )}
                      {canMarkPaid && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingSaleId(row.id);
                            if (row.payoutStatus === "pending" && row.payoutId) {
                              settlePendingPayoutMutation.mutate(row.payoutId);
                              return;
                            }
                            markPaidMutation.mutate({
                              affiliateId: row.affiliateId,
                              saleId: row.id,
                            });
                          }}
                          disabled={payingSaleId !== null}
                          className="rounded-[8px] bg-[#1c4aa6] px-[16px] py-[8px] font-[var(--font-sans)] text-[12px] leading-[18px] text-[#f0f0f0] transition-colors hover:bg-[#1a3f8f] disabled:opacity-50"
                        >
                          {payingSaleId === row.id
                            ? (row.payoutStatus === "pending" && row.payoutId ? "Settling..." : "Processing...")
                            : "Mark Paid"}
                        </button>
                      )}
                      {isBundledPendingPayout && (
                        <span
                          className="inline-block rounded-[8px] border border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)] px-[12px] py-[8px] font-[var(--font-sans)] text-[12px] leading-[18px] text-[#f59e0b]"
                          title="This payout is linked to multiple sales, so paying it from one row settles all linked rows. Repair the bundled payout data before using per-row actions."
                        >
                          Bundled payout
                        </span>
                      )}
                      {cStatus === "pending" && row.affiliateId && (
                        <button
                          type="button"
                          onClick={() => {
                            setPayingSaleId(row.id);
                            approveMutation.mutate(row.id);
                          }}
                          disabled={payingSaleId !== null}
                          className="rounded-[8px] border border-[#132054] bg-[#132054] px-[17px] py-[9px] font-[var(--font-sans)] text-[12px] leading-[18px] text-[#f0f0f0] transition-colors hover:bg-[#1a2a6b] disabled:opacity-50"
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
                          title="Unattributed — assign a marketing partner in the Unattributed Sales panel first"
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

          {/* Pagination — Figma 101:9290/9293 */}
          <div className="flex items-center justify-between border-t px-[16px] py-[var(--space-4)]" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="font-[var(--font-sans)] text-[12px] leading-[17.143px] text-[#b0b8cc]">
              {total > 0
                ? `Showing ${startItem}-${endItem} of ${total} entries`
                : "No entries"}
            </p>
            <div className="flex gap-[8px]">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setFilters({ page: currentPage - 1 })}
                className="rounded-[8px] border border-[rgba(156,164,183,0.3)] bg-transparent px-[17px] py-[9px] font-[var(--font-sans)] text-[12px] leading-[17.143px] text-[#9ca4b7] transition-colors hover:border-[rgba(156,164,183,0.5)] disabled:pointer-events-none disabled:opacity-50"
              >
                Previous
              </button>
              {pageNumbers.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setFilters({ page: num })}
                  className={[
                    "rounded-[8px] border px-[17px] py-[9px] font-[var(--font-sans)] text-[12px] leading-[17.143px] transition-colors",
                    currentPage === num
                      ? "border-[#132054] bg-[#132054] text-[#f0f0f0]"
                      : "border-[rgba(156,164,183,0.3)] bg-transparent text-[#9ca4b7] opacity-50 hover:border-[rgba(156,164,183,0.5)] hover:opacity-100",
                  ].join(" ")}
                >
                  {num}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setFilters({ page: currentPage + 1 })}
                className="rounded-[8px] border border-[rgba(156,164,183,0.3)] bg-transparent px-[17px] py-[9px] font-[var(--font-sans)] text-[12px] leading-[17.143px] text-[#9ca4b7] transition-colors hover:border-[rgba(156,164,183,0.5)] disabled:pointer-events-none disabled:opacity-50"
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
