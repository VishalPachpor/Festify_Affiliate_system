import { apiClient } from "@/services/api/client";
import { affiliateDetailSchema, type AffiliateDetail } from "../types";

export type GetAffiliateDetailsParams = {
  tenantId: string;
  affiliateId: string;
};

export async function getAffiliateDetails(
  params: GetAffiliateDetailsParams,
): Promise<AffiliateDetail> {
  const raw = await apiClient<unknown>(
    `/affiliates/${params.affiliateId}`,
    {
      headers: {
        "x-tenant-id": params.tenantId,
      },
    },
  );

  return affiliateDetailSchema.parse(raw);
}
