import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import { dashboardSummarySchema, type DashboardSummary } from "../types";

export type GetDashboardSummaryParams = {
  tenantId: string;
  campaignId?: string;
};

export async function getDashboardSummary(
  params: GetDashboardSummaryParams,
): Promise<DashboardSummary> {
  if (isMockEnabled()) {
    const { mockGetDashboardSummary } = await import("@/mocks/handlers/dashboard");
    return mockGetDashboardSummary();
  }

  const raw = await apiClient<unknown>("/dashboard/summary", {
    searchParams: {
      tenantId: params.tenantId,
      campaignId: params.campaignId,
    },
  });

  return dashboardSummarySchema.parse(raw);
}
