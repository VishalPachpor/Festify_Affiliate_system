import { apiClient } from "@/services/api/client";
import { dashboardSummarySchema, type DashboardSummary } from "../types";

export type GetDashboardSummaryParams = {
  tenantId: string;
  campaignId?: string;
};

export async function getDashboardSummary(
  params: GetDashboardSummaryParams,
): Promise<DashboardSummary> {
  const raw = await apiClient<unknown>("/dashboard/summary", {
    headers: {
      "x-tenant-id": params.tenantId,
    },
    searchParams: {
      campaignId: params.campaignId,
    },
  });

  return dashboardSummarySchema.parse(raw);
}
