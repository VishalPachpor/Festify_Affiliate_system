import { apiClient } from "@/services/api/client";
import { dashboardTrendSchema, type DashboardTrend } from "../types";

export type GetDashboardTrendParams = {
  tenantId: string;
  campaignId?: string;
};

export async function getDashboardTrend(
  params: GetDashboardTrendParams,
): Promise<DashboardTrend> {
  const raw = await apiClient<unknown>("/dashboard/trend", {
    headers: { "x-tenant-id": params.tenantId },
    searchParams: {
      campaignId: params.campaignId,
    },
  });

  return dashboardTrendSchema.parse(raw);
}
