import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import { affiliateDetailSchema, type AffiliateDetail } from "../types";

export type GetAffiliateDetailsParams = {
  tenantId: string;
  affiliateId: string;
};

export async function getAffiliateDetails(
  params: GetAffiliateDetailsParams,
): Promise<AffiliateDetail> {
  if (isMockEnabled()) {
    const { mockGetAffiliateDetails } = await import("@/mocks/handlers/affiliates");
    return mockGetAffiliateDetails(params.affiliateId);
  }

  const raw = await apiClient<unknown>(
    `/affiliates/${params.affiliateId}`,
    {
      searchParams: {
        tenantId: params.tenantId,
      },
    },
  );

  return affiliateDetailSchema.parse(raw);
}
