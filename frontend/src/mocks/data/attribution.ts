import type { AttributionSummary, SourceBreakdownResponse, FailureReasonsResponse, AttributionTrendResponse } from "@/modules/attribution-insights/types";

export const mockAttributionSummary: AttributionSummary = {
  totalSales: 87,
  attributedCount: 71,
  unattributedCount: 16,
  successRate: 81.6,
  failureRate: 18.4,
  periodStart: "2026-03-01",
  periodEnd: "2026-03-31",
};

export const mockSourceBreakdown: SourceBreakdownResponse = {
  items: [
    { source: "referral_link", count: 34, percentage: 47.9, revenue: 58200, currency: "USD" },
    { source: "referral_code", count: 22, percentage: 31.0, revenue: 37400, currency: "USD" },
    { source: "direct", count: 9, percentage: 12.7, revenue: 15300, currency: "USD" },
    { source: "organic", count: 6, percentage: 8.5, revenue: 10200, currency: "USD" },
  ],
};

export const mockFailureReasons: FailureReasonsResponse = {
  totalFailures: 16,
  items: [
    { reason: "No referral data in URL or session", count: 7, percentage: 43.8 },
    { reason: "Referral code expired", count: 4, percentage: 25.0 },
    { reason: "Cookie blocked by browser", count: 3, percentage: 18.8 },
    { reason: "Affiliate account inactive", count: 2, percentage: 12.5 },
  ],
};

export const mockAttributionTrend: AttributionTrendResponse = {
  periodStart: "2026-03-25",
  periodEnd: "2026-03-31",
  points: [
    { date: "2026-03-25", attributed: 11, unattributed: 2, successRate: 84.6 },
    { date: "2026-03-26", attributed: 14, unattributed: 3, successRate: 82.4 },
    { date: "2026-03-27", attributed: 9, unattributed: 1, successRate: 90.0 },
    { date: "2026-03-28", attributed: 16, unattributed: 4, successRate: 80.0 },
    { date: "2026-03-29", attributed: 12, unattributed: 2, successRate: 85.7 },
    { date: "2026-03-30", attributed: 10, unattributed: 3, successRate: 76.9 },
    { date: "2026-03-31", attributed: 8, unattributed: 1, successRate: 88.9 },
  ],
};
