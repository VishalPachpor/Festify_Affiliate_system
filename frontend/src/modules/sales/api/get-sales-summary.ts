import { apiClient } from "@/services/api/client";
import { salesSummarySchema, type SalesSummary } from "../types";

export type GetSalesSummaryParams = {
  tenantId: string;
  campaignId?: string;
  from?: string;
  to?: string;
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
      from: params.from,
      to: params.to,
    },
  });

  return salesSummarySchema.parse(raw);
}
