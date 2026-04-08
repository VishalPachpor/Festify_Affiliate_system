"use client";

import { useQuery } from "@tanstack/react-query";
import { getAttributionTrends } from "../api/get-attribution-trends";
import { attributionInsightsKeys } from "../query-keys";

export function useAttributionTrends(tenantId: string | undefined) {
  return useQuery({
    queryKey: attributionInsightsKeys.trend(tenantId ?? ""),
    queryFn: () => getAttributionTrends(tenantId!),
    enabled: !!tenantId,
  });
}
