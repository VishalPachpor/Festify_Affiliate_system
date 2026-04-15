"use client";

import { useState } from "react";
import { useTenant } from "@/modules/tenant-shell";
import { useSalesList } from "@/modules/sales/hooks/use-sales-list";
import { useSalesSummary } from "@/modules/sales/hooks/use-sales-summary";
import { useSalesFilters } from "@/modules/sales/hooks/use-sales-filters";
import type { Sale } from "@/modules/sales/types";
import { DashboardContainer } from "@/modules/dashboard/components/dashboard-layout";
import { DashboardStageCanvas } from "@/modules/dashboard/components/dashboard-stage-canvas";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const SALES_COLORS = {
  panel: "transparent",
  border: "rgba(255,255,255,0.08)",
  label: "rgba(255,255,255,0.50)",
  subtitle: "rgba(255,255,255,0.50)",
  chartTick: "rgba(255,255,255,0.40)",
  chartGrid: "rgba(255,255,255,0.06)",
  chartGold: "#F5A623",
  headerRow: "transparent",
  headerText: "rgba(255,255,255,0.50)",
  bodyText: "rgba(255,255,255,0.60)",
  bodyTextStrong: "#FFFFFF",
  commission: "#22C55E",
  plainStatus: "rgba(255,255,255,0.55)",
  pendingBg: "rgba(234,179,8,0.14)",
  pendingText: "#EAB308",
  rejectedBg: "rgba(239,68,68,0.14)",
  rejectedText: "#EF4444",
} as const;

// ── Formatters ─────────────────────────────────────────────────────────────────

function formatCurrency(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(minorUnits / 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/(\d+)\/(\d+)\/(\d+)/, "$3-$1-$2");
}

// ── Ticket type derivation ────────────────────────────────────────────────────

function deriveTicketType(amount: number): string {
  if (amount >= 1200) return "VIP Pass";
  if (amount >= 800) return "Premium";
  if (amount >= 500) return "Workshop";
  return "General";
}

// ── Mask email-style display for customer ─────────────────────────────────────

function maskName(name: string): string {
  const first = name.charAt(0).toLowerCase();
  const parts = name.split(" ");
  const lastInitial = parts.length > 1 ? parts[parts.length - 1].charAt(0).toLowerCase() : "x";
  return `${first}***${lastInitial}@email.com`;
}

// ── Status styling ─────────────────────────────────────────────────────────────

function StatusCell({ status }: { status: Sale["status"] }) {
  if (status === "confirmed" || status === "paid") {
    return (
      <span
        className="font-[var(--font-sans)] text-[var(--text-sm)] font-medium leading-[var(--leading-snug)]"
        style={{ color: SALES_COLORS.plainStatus }}
      >
        {status}
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span
        className="inline-block rounded-[var(--space-1)] px-[var(--space-2)] py-[0.125rem] font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--leading-snug)]"
        style={{
          background: SALES_COLORS.pendingBg,
          color: SALES_COLORS.pendingText,
        }}
      >
        pending
      </span>
    );
  }
  // rejected
  return (
    <span
      className="inline-block rounded-[var(--space-1)] px-[var(--space-2)] py-[0.125rem] font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--leading-snug)]"
      style={{
        background: SALES_COLORS.rejectedBg,
        color: SALES_COLORS.rejectedText,
      }}
    >
      rejected
    </span>
  );
}

// ── Time period tabs ──────────────────────────────────────────────────────────

const TIME_PERIODS = ["This Week", "This Month", "All Time"] as const;

// ── KPI summary card ──────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accentColor,
  change,
}: {
  label: string;
  value: string;
  accentColor: string;
  change?: string;
}) {
  return (
    <div
      className="flex flex-col gap-[var(--space-2)] rounded-[var(--radius)] border px-[var(--space-5)] py-[var(--space-4)]"
      style={{
        borderColor: SALES_COLORS.border,
        background: SALES_COLORS.panel,
      }}
    >
      {/* Short accent line */}
      <div className="h-[2px] w-[2rem] rounded-full" style={{ background: accentColor }} />
      <dt
        className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] tracking-[var(--tracking-caption)] uppercase"
        style={{ color: SALES_COLORS.label }}
      >
        {label}
      </dt>
      <dd className="font-[var(--font-display)] font-bold text-[var(--text-xl)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[#FFFFFF]">
        {value}
      </dd>
      {change && (
        <p className="flex items-center gap-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] text-[#22C55E]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 8.5C4 6 6 4.5 10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {change}
        </p>
      )}
    </div>
  );
}

function SummaryCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-[var(--radius)] border border-[var(--color-border)] bg-transparent px-[var(--space-5)] py-[var(--space-4)] flex flex-col gap-[var(--space-2)]"
    >
      <div className="h-[2px] w-[2rem] animate-pulse rounded-full bg-[var(--color-border)]" />
      <div className="h-[var(--text-xs)] w-2/3 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
      <div className="h-[var(--text-xl)] w-1/2 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
    </div>
  );
}

// ── Commission trend chart (Recharts) ─────────────────────────────────────────

function CommissionChart({ sales }: { sales: Sale[] }) {
  const POINTS = 10;

  // Bucket last N days, compute commission sums
  const buckets: { date: string; value: number }[] = [];
  for (let i = POINTS - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const start = new Date(d);
    const end = new Date(d);
    end.setDate(end.getDate() + 1);
    const sum = sales
      .filter((s) => {
        const sd = new Date(s.createdAt);
        return sd >= start && sd < end;
      })
      .reduce((acc, s) => acc + s.commission, 0);
    buckets.push({
      date: d.toLocaleDateString("en-US", { month: "short", day: "2-digit" }),
      value: sum,
    });
  }

  const maxVal = Math.max(...buckets.map((b) => b.value), 1);
  const niceMax = Math.ceil(maxVal / 450) * 450 || 450;
  const yTicks = [0, niceMax * 0.25, niceMax * 0.5, niceMax * 0.75, niceMax];

  return (
    <div
      className="rounded-[var(--radius)] border px-[var(--space-6)] py-[var(--space-5)]"
      style={{
        borderColor: SALES_COLORS.border,
        background: SALES_COLORS.panel,
      }}
      aria-label="Commission trend chart"
    >
      <div className="flex items-start justify-between">
        <h3 className="font-[var(--font-display)] font-bold text-[var(--text-lg)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
          Commission Trend
        </h3>
        <span
          className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)]"
          style={{ color: SALES_COLORS.subtitle }}
        >
          Last 10 days
        </span>
      </div>
      <div className="mt-[var(--space-4)] w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={buckets}
            margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
          >
            <CartesianGrid
              stroke={SALES_COLORS.chartGrid}
              strokeDasharray="none"
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
              tickLine={false}
              tick={{ fill: SALES_COLORS.chartTick, fontSize: 12, fontFamily: "var(--font-sans)" }}
              dy={8}
            />
            <YAxis
              domain={[0, niceMax]}
              ticks={yTicks}
              axisLine={{ stroke: "rgba(255,255,255,0.10)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.10)" }}
              tick={{ fill: SALES_COLORS.chartTick, fontSize: 12, fontFamily: "var(--font-sans)" }}
              tickFormatter={(v: number) => String(Math.round(v))}
              width={45}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={SALES_COLORS.chartGold}
              strokeWidth={2.5}
              dot={{
                r: 4,
                fill: SALES_COLORS.chartGold,
                stroke: "#1A1E2E",
                strokeWidth: 2,
              }}
              activeDot={{
                r: 5,
                fill: SALES_COLORS.chartGold,
                stroke: "#1A1E2E",
                strokeWidth: 2,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ── Table skeleton ─────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-[var(--space-3)]">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-[var(--space-4)]">
          <div className="h-[var(--text-sm)] w-1/6 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
          <div className="h-[var(--text-sm)] w-1/5 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
          <div className="h-[var(--text-sm)] w-1/6 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
          <div className="h-[var(--text-sm)] w-1/6 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
          <div className="h-[var(--text-sm)] w-1/6 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
          <div className="ml-auto h-[var(--text-xs)] w-16 animate-pulse rounded-[var(--radius)] bg-[var(--color-border)]" />
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 6;

function getDateRange(period: string): { from?: string; to?: string } {
  const now = new Date();
  const to = now.toISOString().split("T")[0];

  if (period === "This Week") {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    return { from: weekStart.toISOString().split("T")[0], to };
  }
  if (period === "This Month") {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: monthStart.toISOString().split("T")[0], to };
  }
  // "All Time" — no filter
  return {};
}

export default function SalesPage() {
  const { tenant } = useTenant();
  const { filters, setFilters } = useSalesFilters();
  const [timePeriod, setTimePeriod] = useState<(typeof TIME_PERIODS)[number]>("This Month");

  const dateRange = getDateRange(timePeriod);

  const { data: summaryData, isLoading: summaryLoading } = useSalesSummary(tenant?.id, undefined, dateRange);
  const { data: listData, isLoading: listLoading } = useSalesList(tenant?.id, {
    ...filters,
    ...dateRange,
    pageSize: PAGE_SIZE,
  });

  const sales = listData?.sales ?? [];
  const total = listData?.total ?? 0;
  const totalPages = listData?.totalPages ?? 1;
  const currentPage = filters.page;
  const currency = summaryData?.currency ?? "USD";

  const startItem = (currentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(currentPage * PAGE_SIZE, total);

  // Generate page numbers for pagination
  const pageNumbers: number[] = [];
  const maxPageButtons = 3;
  let startPage = Math.max(1, currentPage - 1);
  const endPage = Math.min(totalPages, startPage + maxPageButtons - 1);
  if (endPage - startPage < maxPageButtons - 1) {
    startPage = Math.max(1, endPage - maxPageButtons + 1);
  }
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }

  return (
    <DashboardStageCanvas>
      <DashboardContainer>
        {/* Time period tabs */}
        <div className="flex items-center gap-[var(--space-2)]">
          {TIME_PERIODS.map((period) => {
            const isActive = timePeriod === period;
            return (
              <button
                key={period}
                type="button"
                onClick={() => setTimePeriod(period)}
                className={[
                  "rounded-[var(--radius)] border px-[var(--space-4)] py-[var(--space-2)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--leading-snug)] transition-colors duration-[var(--duration-normal)]",
                  isActive
                    ? "border-[rgba(255,255,255,0.08)] !bg-[rgba(255,255,255,0.95)] !text-[#000000]"
                    : "border-transparent bg-[#151A2A] text-[rgba(255,255,255,0.72)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--color-text-primary)]",
                ].join(" ")}
              >
                {period}
              </button>
            );
          })}
        </div>

        {/* KPI Summary */}
        <dl className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-3">
          {summaryLoading ? (
            <>
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
              <SummaryCardSkeleton />
            </>
          ) : (
            <>
              <SummaryCard
                label="Total Sales"
                value={formatCurrency(summaryData?.totalRevenue ?? 0, currency)}
                accentColor="#FFFFFF"
              />
              <SummaryCard
                label="Commission Earned"
                value={formatCurrency(summaryData?.totalCommissions ?? 0, currency)}
                accentColor="#5B8DEF"
              />
              <SummaryCard
                label="Tickets Sold"
                value={String(summaryData?.totalSales ?? 0)}
                accentColor="#22C55E"
              />
            </>
          )}
        </dl>

        {/* Commission chart */}
        {!listLoading && sales.length > 0 && (
          <CommissionChart sales={sales} />
        )}

        {/* Sales History table */}
        <div
          className="rounded-[var(--radius)] border"
          style={{
            borderColor: SALES_COLORS.border,
            background: SALES_COLORS.panel,
          }}
        >
          {/* Panel header */}
          <div className="border-b px-[var(--space-6)] py-[var(--space-5)]" style={{ borderColor: SALES_COLORS.border }}>
            <h3 className="font-[var(--font-display)] font-bold text-[var(--text-lg)] leading-[var(--leading-tight)] tracking-[var(--tracking-heading)] text-[var(--color-text-primary)]">
              Sales History
            </h3>
            <p
              className="mt-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-sm)] leading-[var(--leading-snug)]"
              style={{ color: SALES_COLORS.subtitle }}
            >
              Detailed breakdown of your attributed ticket sales
            </p>
          </div>

          {/* Table */}
          <div className="px-[var(--space-6)] py-[var(--space-5)]" aria-live="polite" aria-busy={listLoading}>
            {listLoading ? (
              <TableSkeleton />
            ) : sales.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="font-[var(--font-sans)] text-[var(--text-sm)] text-[var(--color-text-muted)]">
                  No sales found.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse font-[var(--font-sans)]" aria-label="Sales history">
                  <thead>
                    <tr style={{ background: SALES_COLORS.headerRow }}>
                      {["Date", "Customer", "Ticket Type", "Order Value", "Commission", "Status"].map((col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-[var(--space-3)] py-[var(--space-3)] text-left text-[var(--text-xs)] leading-[var(--leading-caption)] tracking-[var(--tracking-caption)] uppercase font-semibold whitespace-nowrap first:pl-0 last:pr-0"
                          style={{ color: SALES_COLORS.headerText }}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sales.slice(0, PAGE_SIZE).map((sale) => (
                      <tr
                        key={sale.id}
                        className="border-t"
                        style={{ borderColor: "rgba(255,255,255,0.06)" }}
                      >
                        <td
                          className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] leading-[var(--leading-snug)] whitespace-nowrap"
                          style={{ color: SALES_COLORS.bodyText }}
                        >
                          {formatDate(sale.createdAt)}
                        </td>
                        <td
                          className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] leading-[var(--leading-snug)] whitespace-nowrap"
                          style={{ color: SALES_COLORS.bodyText }}
                        >
                          {maskName(sale.affiliateName)}
                        </td>
                        <td
                          className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] leading-[var(--leading-snug)] whitespace-nowrap"
                          style={{ color: SALES_COLORS.bodyText }}
                        >
                          {deriveTicketType(sale.amount)}
                        </td>
                        <td
                          className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] leading-[var(--leading-snug)] whitespace-nowrap"
                          style={{ color: SALES_COLORS.bodyTextStrong }}
                        >
                          {formatCurrency(sale.amount, sale.currency)}
                        </td>
                        <td
                          className="py-[var(--space-3)] pr-[var(--space-4)] text-[var(--text-sm)] leading-[var(--leading-snug)] whitespace-nowrap"
                          style={{ color: SALES_COLORS.commission }}
                        >
                          {formatCurrency(sale.commission, sale.currency)}
                        </td>
                        <td className="py-[var(--space-3)]">
                          <StatusCell status={sale.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {!listLoading && totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-[var(--space-6)] py-[var(--space-4)]" style={{ borderColor: SALES_COLORS.border }}>
              <p className="font-[var(--font-sans)] text-[var(--text-xs)] leading-[var(--leading-caption)] text-[var(--color-text-muted)]">
                Showing {startItem}-{endItem} of {total} transactions
              </p>
              <div className="flex gap-[var(--space-2)]">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters({ page: currentPage - 1 })}
                  className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.78)] transition-colors hover:border-[rgba(255,255,255,0.18)] hover:text-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-40"
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
                        : "border-[rgba(255,255,255,0.12)] bg-transparent text-[rgba(255,255,255,0.78)] hover:border-[rgba(255,255,255,0.18)] hover:text-[var(--color-text-primary)]",
                    ].join(" ")}
                  >
                    {num}
                  </button>
                ))}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters({ page: currentPage + 1 })}
                  className="rounded-[var(--radius)] border border-[rgba(255,255,255,0.12)] bg-transparent px-[var(--space-3)] py-[var(--space-1)] font-[var(--font-sans)] text-[var(--text-xs)] text-[rgba(255,255,255,0.78)] transition-colors hover:border-[rgba(255,255,255,0.18)] hover:text-[var(--color-text-primary)] disabled:pointer-events-none disabled:opacity-40"
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
