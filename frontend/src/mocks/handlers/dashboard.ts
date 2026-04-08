import { delay } from "../utils";
import {
  mockDashboardSummary,
  mockDashboardTrend,
  mockTopAffiliates,
  mockRecentActivity,
} from "../data/dashboard";
import {
  dashboardSummarySchema,
  dashboardTrendSchema,
  topAffiliatesResponseSchema,
  recentActivityResponseSchema,
} from "@/modules/dashboard/types";

export async function mockGetDashboardSummary() {
  await delay();
  return dashboardSummarySchema.parse(mockDashboardSummary);
}

export async function mockGetDashboardTrend() {
  await delay();
  return dashboardTrendSchema.parse(mockDashboardTrend);
}

export async function mockGetTopAffiliates() {
  await delay();
  return topAffiliatesResponseSchema.parse(mockTopAffiliates);
}

export async function mockGetRecentActivity() {
  await delay();
  return recentActivityResponseSchema.parse(mockRecentActivity);
}
