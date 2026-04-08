import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import { salesListResponseSchema, type SalesListResponse, type SalesFilterState } from "../types";

export type GetSalesListParams = {
  tenantId: string;
  campaignId?: string;
  filters: SalesFilterState;
};

export async function getSalesList(
  params: GetSalesListParams,
): Promise<SalesListResponse> {
  if (isMockEnabled()) {
    const { mockGetSalesList } = await import("@/mocks/handlers/sales");
    return mockGetSalesList(params.filters);
  }

  const { tenantId, campaignId, filters } = params;

  const raw = await apiClient<unknown>("/sales", {
    searchParams: {
      tenantId,
      campaignId,
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      affiliateId: filters.affiliateId,
      search: filters.search,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
      attributed: filters.attributed,
      attributionSource: filters.attributionSource,
    },
  });

  return salesListResponseSchema.parse(raw);
}
