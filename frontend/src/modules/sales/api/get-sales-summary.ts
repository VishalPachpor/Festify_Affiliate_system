import { apiClient } from "@/services/api/client";
import { salesSummarySchema, type SalesSummary } from "../types";

export type GetSalesSummaryParams = {
  tenantId: string;
  campaignId?: string;
};

export async function getSalesSummary(
  params: GetSalesSummaryParams,
): Promise<SalesSummary> {
  const raw = await apiClient<unknown>("/sales/summary", {
    headers: {
      "x-tenant-id": params.tenantId,
    },
    searchParams: {
      campaignId: params.campaignId,
    },
  });

  return salesSummarySchema.parse(raw);
}
