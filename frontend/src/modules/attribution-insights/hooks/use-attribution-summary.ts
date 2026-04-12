"use client";

import { useQuery } from "@tanstack/react-query";
import { getAttributionSummary } from "../api/get-attribution-summary";
import { attributionInsightsKeys } from "../query-keys";

export function useAttributionSummary(tenantId: string | undefined) {
  return useQuery({
    queryKey: attributionInsightsKeys.summary(tenantId ?? ""),
    queryFn: () => getAttributionSummary(tenantId!),
  });
}
