import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import { payoutSummarySchema, type PayoutSummary } from "../types";

export type GetPayoutSummaryParams = {
  tenantId: string;
};

export async function getPayoutSummary(
  params: GetPayoutSummaryParams,
): Promise<PayoutSummary> {
  if (isMockEnabled()) {
    const { mockGetPayoutSummary } = await import("@/mocks/handlers/payouts");
    return mockGetPayoutSummary();
  }

  const raw = await apiClient<unknown>("/payouts/summary", {
    searchParams: {
      tenantId: params.tenantId,
    },
  });

  return payoutSummarySchema.parse(raw);
}
