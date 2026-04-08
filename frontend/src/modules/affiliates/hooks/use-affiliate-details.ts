"use client";

import { useQuery } from "@tanstack/react-query";
import { getAffiliateDetails } from "../api/get-affiliate-details";
import { affiliatesKeys } from "../query-keys";

export function useAffiliateDetails(
  tenantId: string | undefined,
  affiliateId: string | undefined,
) {
  return useQuery({
    queryKey: affiliatesKeys.detail(tenantId ?? "", affiliateId ?? ""),
    queryFn: () =>
      getAffiliateDetails({
        tenantId: tenantId!,
        affiliateId: affiliateId!,
      }),
    enabled: !!tenantId && !!affiliateId,
  });
}
