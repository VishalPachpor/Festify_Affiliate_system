import type { DashboardSummary, DashboardTrend, TopAffiliatesResponse, RecentActivityResponse } from "@/modules/dashboard/types";

export const mockDashboardSummary: DashboardSummary = {
  totalRevenue: 12450,
  totalCommissions: 2340,
  totalAffiliates: 47,
  conversionRate: 12.4,
  paidOut: 2340,
  milestonesUnlocked: 0,
  currency: "USD",
  periodStart: "2026-03-01",
  periodEnd: "2026-03-31",
  revenueChangePct: 12.5,
  commissionsChangePct: 8,
};

export const mockDashboardTrend: DashboardTrend = {
  currency: "USD",
  periodStart: "2026-03-25",
  periodEnd: "2026-03-31",
  points: [
    { date: "2026-03-25", revenue: 38200, commissions: 3820 },
    { date: "2026-03-26", revenue: 42100, commissions: 4210 },
    { date: "2026-03-27", revenue: 35800, commissions: 3580 },
    { date: "2026-03-28", revenue: 51200, commissions: 5120 },
    { date: "2026-03-29", revenue: 44600, commissions: 4460 },
    { date: "2026-03-30", revenue: 39100, commissions: 3910 },
    { date: "2026-03-31", revenue: 33500, commissions: 3350 },
  ],
};

export const mockTopAffiliates: TopAffiliatesResponse = {
  currency: "USD",
  affiliates: [
    { id: "aff-1", name: "Sarah Chen", email: "sarah@example.com", totalSales: 89, totalRevenue: 67200, conversionRate: 18.2 },
    { id: "aff-2", name: "Marcus Johnson", email: "marcus@example.com", totalSales: 72, totalRevenue: 54100, conversionRate: 15.6 },
    { id: "aff-3", name: "Priya Patel", email: "priya@example.com", totalSales: 58, totalRevenue: 43500, conversionRate: 13.1 },
    { id: "aff-4", name: "James Kim", email: "james@example.com", totalSales: 41, totalRevenue: 30800, conversionRate: 11.7 },
    { id: "aff-5", name: "Elena Rodriguez", email: "elena@example.com", totalSales: 35, totalRevenue: 26300, conversionRate: 10.4 },
  ],
};

export const mockRecentActivity: RecentActivityResponse = {
  items: [
    { id: "act-1", type: "sale", description: "Ticket purchase — VIP Pass", amount: 1200, currency: "USD", affiliateName: "Sarah Chen", timestamp: new Date(Date.now() - 120_000).toISOString() },
    { id: "act-2", type: "signup", description: "New affiliate registered", affiliateName: "David Park", timestamp: new Date(Date.now() - 900_000).toISOString() },
    { id: "act-3", type: "payout", description: "Commission payout processed", amount: 4500, currency: "USD", affiliateName: "Marcus Johnson", timestamp: new Date(Date.now() - 3_600_000).toISOString() },
    { id: "act-4", type: "sale", description: "Ticket purchase — General Admission", amount: 450, currency: "USD", affiliateName: "Priya Patel", timestamp: new Date(Date.now() - 7_200_000).toISOString() },
    { id: "act-5", type: "milestone", description: "Reached 50 sales milestone", affiliateName: "Sarah Chen", timestamp: new Date(Date.now() - 14_400_000).toISOString() },
  ],
};
