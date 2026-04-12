"use client";

import { useQuery } from "@tanstack/react-query";
import { getSalesSummary } from "../api/get-sales-summary";
import { salesKeys } from "../query-keys";

export function useSalesSummary(
  tenantId: string | undefined,
  campaignId?: string,
) {
  return useQuery({
    queryKey: salesKeys.summary(tenantId ?? "", campaignId),
    queryFn: () =>
      getSalesSummary({ tenantId: tenantId!, campaignId }),
  });
}
