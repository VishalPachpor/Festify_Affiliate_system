"use client";

import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import { useTenant } from "@/modules/tenant-shell";
import { usePayoutSummary } from "@/modules/payouts/hooks/use-payout-summary";
import { useSalesList } from "@/modules/sales/hooks/use-sales-list";
import { useSalesFilters } from "@/modules/sales/hooks/use-sales-filters";
import type { Sale } from "@/modules/sales/types";

type CommissionStatus = "paid" | "approved" | "pending";

// ── Formatters ────────────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
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
      className="inline-block rounded-[0.25rem] px-[0.5rem] py-[0.1rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium"
      style={{ background: "rgba(234,179,8,0.14)", color: "#EAB308" }}
    >
      pending
    </span>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

function ActionButton({ label, variant }: { label: string; variant: "primary" | "outline" }) {
  if (variant === "primary") {
    return (
      <button
        type="button"
        className="rounded-[var(--radius)] bg-[var(--color-primary)] px-[var(--space-4)] py-[0.35rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[var(--color-primary-foreground)] transition-colors hover:bg-[var(--color-primary-hover)]"
      >
        {label}
      </button>
    );
  }
  return (
    <button
      type="button"
      className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-4)] py-[0.35rem] font-[var(--font-sans)] text-[var(--text-xs)] font-medium text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)]"
    >
      {label}
    </button>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, accentColor }: { label: string; value: string; accentColor: string }) {
  return (
    <div className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent px-[var(--space-6)] py-[var(--space-5)]">
      <dt
        className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] tracking-[var(--tracking-caption)] uppercase"
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

// ── Page ───────────────────────────────────────────────────────────────────────

function toCommissionStatus(s: Sale["status"]): CommissionStatus {
  if (s === "paid") return "paid";
  if (s === "confirmed") return "approved";
  return "pending";
}

export default function AdminCommissionsPage() {
  const { tenant } = useTenant();
  const { filters, setFilters } = useSalesFilters();
  const { data: salesData } = useSalesList(tenant?.id, filters);
  const { data: summaryData } = usePayoutSummary(tenant?.id);

  const sales: Sale[] = salesData?.sales ?? [];
  const filtered = sales;

  const totalPaid = summaryData?.totalPaid ?? 0;
  const totalPending = summaryData?.totalPending ?? 0;
  const totalEarned = totalPaid + totalPending;
  const currentPage = filters.page;

  return (
    <DashboardStageCanvas>
      <div className="flex flex-col gap-[1.5rem] px-[2rem] py-[2rem]">
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
            value={formatCurrency(totalPending)}
            accentColor="#F5A623"
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
          <button
            type="button"
            className="flex items-center gap-[0.4rem] rounded-[var(--radius)] bg-[rgba(255,255,255,0.06)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.10)]"
          >
            dd-mm-yyyy
            <IconChevronDown />
          </button>
          <button
            type="button"
            className="flex items-center gap-[0.4rem] rounded-[var(--radius)] bg-[rgba(255,255,255,0.06)] px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:bg-[rgba(255,255,255,0.10)]"
          >
            All status
            <IconChevronDown />
          </button>
          <button
            type="button"
            className="flex items-center gap-[0.5rem] rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-primary)] transition-colors hover:border-[rgba(255,255,255,0.20)]"
          >
            <IconDownload />
            Export CSV
          </button>
        </div>

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
                {filtered.map((row) => {
                  const cStatus = toCommissionStatus(row.status);
                  const isPaid = row.status === "paid";
                  return (
                  <tr key={row.id} className="border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    {/* Affiliate */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] font-medium text-[var(--color-text-primary)] whitespace-nowrap">
                      {row.affiliateName}
                    </td>
                    {/* Total Sales */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] text-[#FFFFFF] whitespace-nowrap">
                      {formatCurrency(row.amount)}
                    </td>
                    {/* Commission */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] text-[#F5A623] whitespace-nowrap">
                      {formatCurrency(row.commission)}
                    </td>
                    {/* Status */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] whitespace-nowrap">
                      <StatusCell status={cStatus} />
                    </td>
                    {/* Paid */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] text-[#22C55E] whitespace-nowrap">
                      {formatCurrency(isPaid ? row.commission : 0)}
                    </td>
                    {/* Outstanding */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] text-[#F5A623] whitespace-nowrap">
                      {formatCurrency(isPaid ? 0 : row.commission)}
                    </td>
                    {/* Payout Date */}
                    <td className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] text-[rgba(255,255,255,0.55)] whitespace-nowrap">
                      {row.createdAt ?? "—"}
                    </td>
                    {/* Actions */}
                    <td className="py-[var(--space-3)] whitespace-nowrap">
                      {cStatus === "approved" && (
                        <ActionButton label="Mark Paid" variant="primary" />
                      )}
                      {cStatus === "pending" && (
                        <ActionButton label="Approve" variant="outline" />
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
              Showing 1-{filtered.length} of {filtered.length} affiliates
            </p>
            <div className="flex gap-[var(--space-2)]">
              <button
                type="button"
                disabled
                className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.30)] disabled:pointer-events-none"
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-[var(--radius)] border border-[#5B8DEF] bg-[#5B8DEF] px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-white"
              >
                {currentPage}
              </button>
              <button
                type="button"
                disabled
                className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.08)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.30)] disabled:pointer-events-none"
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
