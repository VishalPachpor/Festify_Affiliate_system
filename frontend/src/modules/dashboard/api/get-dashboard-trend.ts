import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import { dashboardTrendSchema, type DashboardTrend } from "../types";

export type GetDashboardTrendParams = {
  tenantId: string;
  campaignId?: string;
};

export async function getDashboardTrend(
  params: GetDashboardTrendParams,
): Promise<DashboardTrend> {
  if (isMockEnabled()) {
    const { mockGetDashboardTrend } = await import("@/mocks/handlers/dashboard");
    return mockGetDashboardTrend();
  }

  const raw = await apiClient<unknown>("/dashboard/trend", {
    searchParams: {
      tenantId: params.tenantId,
      campaignId: params.campaignId,
    },
  });

  return dashboardTrendSchema.parse(raw);
}
