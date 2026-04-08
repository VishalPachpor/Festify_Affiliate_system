import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import { salesSummarySchema, type SalesSummary } from "../types";

export type GetSalesSummaryParams = {
  tenantId: string;
  campaignId?: string;
};

export async function getSalesSummary(
  params: GetSalesSummaryParams,
): Promise<SalesSummary> {
  if (isMockEnabled()) {
    const { mockGetSalesSummary } = await import("@/mocks/handlers/sales");
    return mockGetSalesSummary();
  }

  const raw = await apiClient<unknown>("/sales/summary", {
    searchParams: {
      tenantId: params.tenantId,
      campaignId: params.campaignId,
    },
  });

  return salesSummarySchema.parse(raw);
}
