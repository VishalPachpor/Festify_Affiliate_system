import { z } from "zod";

// ── Summary ──────────────────────────────────────────────

export const dashboardSummarySchema = z.object({
  totalRevenue: z.number(),
  totalCommissions: z.number(),
  totalAffiliates: z.number(),
  conversionRate: z.number(),
  paidOut: z.number(),
  milestonesUnlocked: z.number(),
  currency: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
  // optional period-over-period change percentages
  revenueChangePct: z.number().optional(),
  commissionsChangePct: z.number().optional(),
  paidOutChangePct: z.number().optional(),
  milestonesChangePct: z.number().optional(),
});

export type DashboardSummary = z.infer<typeof dashboardSummarySchema>;

// ── Trend ────────────────────────────────────────────────

export const trendPointSchema = z.object({
  date: z.string(),
  revenue: z.number(),
  commissions: z.number(),
});

export const dashboardTrendSchema = z.object({
  points: z.array(trendPointSchema),
  currency: z.string(),
  periodStart: z.string(),
  periodEnd: z.string(),
});

export type TrendPoint = z.infer<typeof trendPointSchema>;
export type DashboardTrend = z.infer<typeof dashboardTrendSchema>;

// ── Top Affiliates ───────────────────────────────────────

export const topAffiliateSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  totalSales: z.number(),
  totalRevenue: z.number(),
  conversionRate: z.number(),
});

export const topAffiliatesResponseSchema = z.object({
  affiliates: z.array(topAffiliateSchema),
  currency: z.string(),
});

export type TopAffiliate = z.infer<typeof topAffiliateSchema>;
export type TopAffiliatesResponse = z.infer<typeof topAffiliatesResponseSchema>;

// ── Recent Activity ──────────────────────────────────────

export const activityItemSchema = z.object({
  id: z.string(),
  type: z.enum(["sale", "signup", "payout", "milestone"]),
  description: z.string(),
  amount: z.number().optional(),
  currency: z.string().optional(),
  affiliateName: z.string(),
  timestamp: z.string(),
});

export const recentActivityResponseSchema = z.object({
  items: z.array(activityItemSchema),
});

export type ActivityItem = z.infer<typeof activityItemSchema>;
export type RecentActivityResponse = z.infer<typeof recentActivityResponseSchema>;
