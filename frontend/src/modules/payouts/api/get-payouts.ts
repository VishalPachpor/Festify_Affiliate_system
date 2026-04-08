import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import {
  payoutsListResponseSchema,
  type PayoutsListResponse,
  type PayoutsFilterState,
} from "../types";

export type GetPayoutsParams = {
  tenantId: string;
  filters: PayoutsFilterState;
};

export async function getPayouts(
  params: GetPayoutsParams,
): Promise<PayoutsListResponse> {
  if (isMockEnabled()) {
    const { mockGetPayouts } = await import("@/mocks/handlers/payouts");
    return mockGetPayouts(params.filters);
  }

  const { tenantId, filters } = params;

  const raw = await apiClient<unknown>("/payouts", {
    searchParams: {
      tenantId,
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status,
      affiliateId: filters.affiliateId,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    },
  });

  return payoutsListResponseSchema.parse(raw);
}
