import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import {
  affiliatesListResponseSchema,
  type AffiliatesListResponse,
  type AffiliatesFilterState,
} from "../types";

export type GetAffiliatesListParams = {
  tenantId: string;
  campaignId?: string;
  filters: AffiliatesFilterState;
};

export async function getAffiliatesList(
  params: GetAffiliatesListParams,
): Promise<AffiliatesListResponse> {
  if (isMockEnabled()) {
    const { mockGetAffiliatesList } = await import("@/mocks/handlers/affiliates");
    return mockGetAffiliatesList(params.filters);
  }

  const { tenantId, campaignId, filters } = params;

  const raw = await apiClient<unknown>("/affiliates", {
    searchParams: {
      tenantId,
      campaignId,
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      search: filters.search,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    },
  });

  return affiliatesListResponseSchema.parse(raw);
}
