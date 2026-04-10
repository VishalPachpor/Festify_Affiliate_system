import { apiClient } from "@/services/api/client";
import { payoutSummarySchema, type PayoutSummary } from "../types";

export type GetPayoutSummaryParams = {
  tenantId: string;
};

export async function getPayoutSummary(
  params: GetPayoutSummaryParams,
): Promise<PayoutSummary> {
  const raw = await apiClient<unknown>("/payouts/summary", {
    headers: {
      "x-tenant-id": params.tenantId,
    },
  });

  return payoutSummarySchema.parse(raw);
}
