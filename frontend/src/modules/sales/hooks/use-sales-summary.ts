"use client";

import { useQuery } from "@tanstack/react-query";
import { getSalesSummary } from "../api/get-sales-summary";
import { salesKeys } from "../query-keys";

export function useSalesSummary(
  tenantId: string | undefined,
  campaignId?: string,
  dateRange?: { from?: string; to?: string },
) {
  return useQuery({
    queryKey: salesKeys.summary(tenantId ?? "", campaignId, dateRange),
    queryFn: () =>
      getSalesSummary({ tenantId: tenantId!, campaignId, from: dateRange?.from, to: dateRange?.to }),
  });
}
