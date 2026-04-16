"use client";

import { useState } from "react";
import { useTenant } from "@/modules/tenant-shell";
import { useSalesList } from "@/modules/sales/hooks/use-sales-list";
import { useSalesSummary } from "@/modules/sales/hooks/use-sales-summary";
import { useSalesFilters } from "@/modules/sales/hooks/use-sales-filters";
import { useDashboardSummary } from "@/modules/dashboard/hooks/use-dashboard-summary";
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

// ── Figma-exact color tokens (node 71:1573) ─────────────────────────────────

const SALES_COLORS = {
  // KPI cards
  cardBg: "rgba(21,26,43,0.8)",
  cardBorder: "rgba(255,255,255,0.1)",
  kpiLabel: "#a6d1ff",
  kpiValue: "#f0f0f0",
  accentTotalSales: "#d9d9d9",
  accentTicketsSold: "#1c4aa6",
  accentCommission: "#22c55e",
  changeText: "#22c55e",

  // Tabs
  tabActiveBg: "#ddd",
  tabActiveText: "#0b0e1a",
  tabInactiveBg: "#0f1628",
  tabInactiveText: "#b0b8cc",

  // Chart
  chartContainerBg: "rgba(15,22,40,0.5)",
  chartContainerBorder: "rgba(255,255,255,0.05)",
  chartTick: "#b0b8cc",
  chartGrid: "rgba(255,255,255,0.06)",
  chartLine: "#F5A623",

  // Table
  tableBorder: "rgba(255,255,255,0.05)",
  headerText: "#b0b8cc",
  bodyDate: "#ffffff",
  bodyCustomer: "#b0b8cc",
  bodyTicketType: "#ffffff",
  bodyOrderValue: "#ffffff",
  bodyCommission: "#c9a84c",
  statusConfirmed: "#f0f0f0",
  pendingBg: "rgba(245,158,11,0.2)",
  pendingText: "#f59e0b",
  rejectedBg: "rgba(239,68,68,0.12)",
  rejectedText: "#ef4444",

  // Pagination
  paginationActiveBg: "#132054",
  paginationActiveBorder: "#132054",
  paginationActiveText: "#f0f0f0",
  paginationInactiveBorder: "rgba(156,164,183,0.3)",
  paginationInactiveText: "#9ca4b7",

  // Subtitle / misc
  subtitle: "#9ca4b7",
  subtitleLight: "#b0b8cc",
} as const;

// ── Formatters ─────────────────────────────────────────────────────────────────

function formatCurrency(minorUnits: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
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

// ── Trend icon (Figma node 71:1856) ───────────────────────────────────────────

function IconTrend() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 12L6 7L9 10L14 4" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 4H14V8" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Status styling (Figma nodes 71:1747, 71:1775, 71:1817) ──────────────────

function StatusCell({ status }: { status: Sale["status"] }) {
  if (status === "confirmed" || status === "paid") {
    return (
      <span
        className="font-[var(--font-sans)] text-[11px] font-medium leading-[14.667px]"
        style={{ color: SALES_COLORS.statusConfirmed }}
      >
        confirmed
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span
        className="inline-block rounded-[4px] px-[5px] py-[3px] font-[var(--font-sans)] text-[11px] font-medium leading-[14.667px]"
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
      className="inline-block rounded-[4px] px-[4px] py-[3px] font-[var(--font-sans)] text-[11px] font-medium leading-[14.667px]"
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

// ── KPI summary card (Figma node 71:1849) ────────────────────────────────────

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
      className="flex flex-col gap-[8px] rounded-[var(--radius)] border p-[24px]"
      style={{
        borderColor: SALES_COLORS.cardBorder,
        background: SALES_COLORS.cardBg,
      }}
    >
      {/* Accent line — 64×4 rounded pill */}
      <div className="h-[4px] w-[64px] rounded-[50px]" style={{ background: accentColor }} />

      {/* Label — 12px uppercase, tracking 0.5px, #a6d1ff */}
      <dt
        className="font-[var(--font-sans)] text-[12px] leading-[16px] tracking-[0.5px] uppercase"
        style={{ color: SALES_COLORS.kpiLabel }}
      >
        {label}
      </dt>

      {/* Value — Open Sauce Sans Bold 28px/42px, #f0f0f0 (body font, not heading) */}
      <dd
        className="font-[var(--font-sans)] text-[28px] font-bold leading-[42px]"
        style={{ color: SALES_COLORS.kpiValue }}
      >
        {value}
      </dd>

      {/* Change indicator — 12px, #22c55e, leading 18px */}
      {change ? (
        <p
          className="flex items-center gap-[4px] font-[var(--font-sans)] text-[12px] leading-[18px]"
          style={{ color: SALES_COLORS.changeText }}
        >
          <IconTrend />
          {change}
        </p>
      ) : (
        <span aria-hidden="true" className="min-h-[18px]" />
      )}
    </div>
  );
}

function SummaryCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-[var(--radius)] border p-[24px] flex flex-col gap-[8px]"
      style={{ borderColor: SALES_COLORS.cardBorder, background: SALES_COLORS.cardBg }}
    >
      <div className="h-[4px] w-[64px] animate-pulse rounded-[50px] bg-[rgba(255,255,255,0.08)]" />
      <div className="h-[16px] w-2/3 animate-pulse rounded-[var(--radius)] bg-[rgba(255,255,255,0.08)]" />
      <div className="h-[28px] w-1/2 animate-pulse rounded-[var(--radius)] bg-[rgba(255,255,255,0.08)]" />
    </div>
  );
}

// ── Commission trend chart (Figma node 71:1616) ─────────────────────────────

function CommissionChart({ sales }: { sales: Sale[] }) {
  const POINTS = 10;

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
      className="rounded-[var(--radius)] border px-[25px] pb-[1px] pt-[25px]"
      style={{
        borderColor: SALES_COLORS.chartContainerBorder,
        background: SALES_COLORS.chartContainerBg,
      }}
      aria-label="Commission trend chart"
    >
      <div className="flex items-start justify-between">
        {/* Heading 3 — Oswald Bold 20/28 */}
        <h3 className="font-[var(--font-display)] text-[20px] font-bold leading-[28px] text-white">
          Commission Trend
        </h3>
        {/* 12px #b0b8cc */}
        <span
          className="font-[var(--font-sans)] text-[12px] leading-[17.143px]"
          style={{ color: SALES_COLORS.subtitleLight }}
        >
          Last 10 days
        </span>
      </div>
      <div className="mt-[24px] w-full" style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={buckets}
            margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.04)"
              strokeDasharray="4 4"
              vertical={true}
              horizontal={true}
            />
            <XAxis
              dataKey="date"
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
              tick={{ fill: SALES_COLORS.chartTick, fontSize: 12, fontFamily: "var(--font-sans)" }}
              dy={8}
            />
            <YAxis
              domain={[0, niceMax]}
              ticks={yTicks}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={{ stroke: "rgba(255,255,255,0.08)", strokeWidth: 1 }}
              tick={{ fill: SALES_COLORS.chartTick, fontSize: 12, fontFamily: "var(--font-sans)" }}
              tickFormatter={(v: number) => String(Math.round(v))}
              width={45}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={SALES_COLORS.chartLine}
              strokeWidth={2}
              dot={{
                r: 3,
                fill: SALES_COLORS.chartLine,
                stroke: "#1A1E2E",
                strokeWidth: 1.5,
              }}
              activeDot={{
                r: 4,
                fill: SALES_COLORS.chartLine,
                stroke: "#1A1E2E",
                strokeWidth: 1.5,
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
          <div className="h-[14px] w-1/6 animate-pulse rounded-[var(--radius)] bg-[rgba(255,255,255,0.08)]" />
          <div className="h-[14px] w-1/5 animate-pulse rounded-[var(--radius)] bg-[rgba(255,255,255,0.08)]" />
          <div className="h-[14px] w-1/6 animate-pulse rounded-[var(--radius)] bg-[rgba(255,255,255,0.08)]" />
          <div className="h-[14px] w-1/6 animate-pulse rounded-[var(--radius)] bg-[rgba(255,255,255,0.08)]" />
          <div className="h-[14px] w-1/6 animate-pulse rounded-[var(--radius)] bg-[rgba(255,255,255,0.08)]" />
          <div className="ml-auto h-[12px] w-16 animate-pulse rounded-[var(--radius)] bg-[rgba(255,255,255,0.08)]" />
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
  return {};
}

export default function SalesPage() {
  const { tenant } = useTenant();
  const { filters, setFilters } = useSalesFilters();
  const [timePeriod, setTimePeriod] = useState<(typeof TIME_PERIODS)[number]>("This Month");

  const dateRange = getDateRange(timePeriod);

  const { data: summaryData, isLoading: summaryLoading } = useSalesSummary(tenant?.id, undefined, dateRange);
  const { data: dashboardSummary } = useDashboardSummary(tenant?.id);
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
        {/* ── Time period tabs (Figma: 71:1834) ────────────────────────── */}
        <div className="flex items-center gap-[8px]">
          {TIME_PERIODS.map((period) => {
            const isActive = timePeriod === period;
            return (
              <button
                key={period}
                type="button"
                onClick={() => setTimePeriod(period)}
                className="inline-flex h-[35px] items-center justify-center rounded-[var(--radius)] border-none px-[16px] font-[var(--font-sans)] text-[14px] leading-[21px] transition-colors duration-[var(--duration-normal)]"
                style={{
                  background: isActive ? SALES_COLORS.tabActiveBg : SALES_COLORS.tabInactiveBg,
                  color: isActive ? SALES_COLORS.tabActiveText : SALES_COLORS.tabInactiveText,
                }}
              >
                {period}
              </button>
            );
          })}
        </div>

        {/* ── KPI Summary (Figma: 71:1848) ─────────────────────────────── */}
        <dl className="grid grid-cols-1 gap-[24px] sm:grid-cols-[2fr_1fr_1fr]">
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
                accentColor={SALES_COLORS.accentTotalSales}
                change={
                  dashboardSummary?.revenueChangePct !== undefined
                    ? `+${dashboardSummary.revenueChangePct.toFixed(1)}%`
                    : undefined
                }
              />
              <SummaryCard
                label="Tickets Sold"
                value={String(summaryData?.totalSales ?? 0)}
                accentColor={SALES_COLORS.accentTicketsSold}
                change={
                  summaryData?.confirmedCount !== undefined && summaryData.confirmedCount > 0
                    ? `+${summaryData.confirmedCount}`
                    : undefined
                }
              />
              <SummaryCard
                label="Commission Rate"
                value={
                  summaryData && summaryData.totalRevenue > 0
                    ? `${Math.round((summaryData.totalCommissions / summaryData.totalRevenue) * 100)}%`
                    : "10%"
                }
                accentColor={SALES_COLORS.accentCommission}
              />
            </>
          )}
        </dl>

        {/* ── Commission chart (Figma: 71:1616) ────────────────────────── */}
        {!listLoading && (
          <CommissionChart sales={sales} />
        )}

        {/* ── Sales History table (Figma: 71:1709) ─────────────────────── */}
        <div
          className="overflow-hidden rounded-[var(--radius)] border"
          style={{
            borderColor: SALES_COLORS.tableBorder,
          }}
        >
          {/* Panel header — 24px padding, 8px gap between title and subtitle */}
          <div
            className="border-b px-[24px] py-[13px]"
            style={{ borderColor: SALES_COLORS.tableBorder }}
          >
            <div className="flex flex-col gap-[8px]">
              {/* Heading 3 — Oswald Bold 20/28 */}
              <h3 className="font-[var(--font-display)] text-[20px] font-bold leading-[28px] text-white">
                Sales History
              </h3>
              {/* Body 2 — 14px/21px, #9ca4b7 */}
              <p
                className="font-[var(--font-sans)] text-[14px] leading-[21px]"
                style={{ color: SALES_COLORS.subtitle }}
              >
                Detailed breakdown of your attributed ticket sales
              </p>
            </div>
          </div>

          {/* Table */}
          <div className="px-[24px] py-[var(--space-5)]" aria-live="polite" aria-busy={listLoading}>
            {listLoading ? (
              <TableSkeleton />
            ) : sales.length === 0 ? (
              <div className="flex h-32 items-center justify-center">
                <p className="font-[var(--font-sans)] text-[14px] text-[var(--color-text-muted)]">
                  No sales found.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse font-[var(--font-sans)]" aria-label="Sales history">
                  <thead>
                    {/* Header row — 12px Bold uppercase, #b0b8cc, tracking 0.2px, leading 14px, py 16px */}
                    <tr>
                      {["Date", "Customer", "Ticket Type", "Order Value", "Commission", "Status"].map((col) => (
                        <th
                          key={col}
                          scope="col"
                          className="px-[16px] py-[16px] text-left text-[12px] font-bold leading-[14px] tracking-[0.2px] uppercase whitespace-nowrap"
                          style={{
                            color: SALES_COLORS.headerText,
                            borderBottom: `1px solid ${SALES_COLORS.tableBorder}`,
                          }}
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
                        style={{
                          background: "rgba(255,255,255,0.02)",
                          borderBottom: `1px solid ${SALES_COLORS.tableBorder}`,
                        }}
                      >
                        {/* Date — 12px white, leading 17.143px */}
                        <td
                          className="px-[16px] py-[24px] text-[12px] leading-[17.143px] whitespace-nowrap"
                          style={{ color: SALES_COLORS.bodyDate }}
                        >
                          {formatDate(sale.createdAt)}
                        </td>
                        {/* Customer — 12px #b0b8cc, leading 16px */}
                        <td
                          className="px-[16px] py-[24px] text-[12px] leading-[16px] whitespace-nowrap"
                          style={{ color: SALES_COLORS.bodyCustomer }}
                        >
                          {maskName(sale.affiliateName)}
                        </td>
                        {/* Ticket Type — 12px white, leading 17.143px */}
                        <td
                          className="px-[16px] py-[24px] text-[12px] leading-[17.143px] whitespace-nowrap"
                          style={{ color: SALES_COLORS.bodyTicketType }}
                        >
                          {deriveTicketType(sale.amount)}
                        </td>
                        {/* Order Value — 16px Regular white, leading 24px (NOT Oswald, NOT bold) */}
                        <td
                          className="px-[16px] py-[17px] text-[16px] leading-[24px] whitespace-nowrap"
                          style={{ color: SALES_COLORS.bodyOrderValue }}
                        >
                          {formatCurrency(sale.amount, sale.currency)}
                        </td>
                        {/* Commission — 16px Medium #c9a84c (gold), leading 24px */}
                        <td
                          className="px-[16px] py-[17px] text-[16px] font-medium leading-[24px] whitespace-nowrap"
                          style={{ color: SALES_COLORS.bodyCommission }}
                        >
                          {formatCurrency(sale.commission, sale.currency)}
                        </td>
                        {/* Status — 11px Medium badge */}
                        <td className="px-[16px] py-[17px]">
                          <StatusCell status={sale.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination (Figma: 71:1819) */}
          {!listLoading && totalPages > 1 && (
            <div
              className="flex items-center justify-between px-[16px] pb-[16px] pt-[17px]"
              style={{ borderTop: `1px solid ${SALES_COLORS.tableBorder}` }}
            >
              {/* "Showing X-Y" — 12px #b0b8cc */}
              <p
                className="font-[var(--font-sans)] text-[12px] leading-[17.143px]"
                style={{ color: SALES_COLORS.subtitleLight }}
              >
                Showing {startItem}-{endItem} of {total} transactions
              </p>
              <div className="flex gap-[8px]">
                {/* Previous button — border rgba(156,164,183,0.3), 12px Medium #9ca4b7 */}
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setFilters({ page: currentPage - 1 })}
                  className="inline-flex h-[35px] items-center justify-center rounded-[var(--radius)] bg-transparent px-[17px] py-[9px] font-[var(--font-sans)] text-[12px] font-medium leading-[17.143px] transition-colors disabled:pointer-events-none disabled:opacity-40"
                  style={{
                    border: `1px solid ${SALES_COLORS.paginationInactiveBorder}`,
                    color: SALES_COLORS.paginationInactiveText,
                  }}
                >
                  Previous
                </button>
                {/* Page number buttons */}
                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setFilters({ page: num })}
                    className="inline-flex h-[36px] min-w-[42px] items-center justify-center rounded-[var(--radius)] font-[var(--font-sans)] text-[12px] font-medium leading-[17.143px] transition-colors"
                    style={{
                      background: currentPage === num ? SALES_COLORS.paginationActiveBg : "transparent",
                      border: `1px solid ${currentPage === num ? SALES_COLORS.paginationActiveBorder : SALES_COLORS.paginationInactiveBorder}`,
                      color: currentPage === num ? SALES_COLORS.paginationActiveText : SALES_COLORS.paginationInactiveText,
                    }}
                  >
                    {num}
                  </button>
                ))}
                {/* Next button */}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setFilters({ page: currentPage + 1 })}
                  className="inline-flex h-[36px] items-center justify-center rounded-[var(--radius)] bg-transparent px-[17px] py-[9px] font-[var(--font-sans)] text-[12px] font-medium leading-[17.143px] transition-colors disabled:pointer-events-none disabled:opacity-40"
                  style={{
                    border: `1px solid ${SALES_COLORS.paginationInactiveBorder}`,
                    color: SALES_COLORS.paginationInactiveText,
                  }}
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
