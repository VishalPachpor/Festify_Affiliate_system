import { apiClient } from "@/services/api/client";
import {
  affiliatesListResponseSchema,
  type AffiliatesListResponse,
  type AffiliatesFilterState,
} from "../types";

export type GetAffiliatesListParams = {
  filters: AffiliatesFilterState;
  campaignId?: string;
};

export async function getAffiliatesList(
  params: GetAffiliatesListParams,
): Promise<AffiliatesListResponse> {
  const { campaignId, filters } = params;

  const raw = await apiClient<unknown>("/affiliates", {
    searchParams: {
      campaignId,
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      tier: filters.tier,
      search: filters.search,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    },
  });

  return affiliatesListResponseSchema.parse(raw);
}
