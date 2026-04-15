import { apiClient } from "@/services/api/client";
import { salesListResponseSchema, type SalesListResponse, type SalesFilterState } from "../types";

export type GetSalesListParams = {
  tenantId: string;
  campaignId?: string;
  filters: SalesFilterState;
};

export async function getSalesList(
  params: GetSalesListParams,
): Promise<SalesListResponse> {
  const { tenantId, campaignId, filters } = params;

  const raw = await apiClient<unknown>("/sales", {
    headers: {
      "x-tenant-id": tenantId,
    },
    searchParams: {
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
      from: filters.from,
      to: filters.to,
    },
  });

  return salesListResponseSchema.parse(raw);
}
