import { apiClient } from "@/services/api/client";
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
  const { tenantId, filters } = params;

  const raw = await apiClient<unknown>("/payouts", {
    headers: {
      "x-tenant-id": tenantId,
    },
    searchParams: {
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
