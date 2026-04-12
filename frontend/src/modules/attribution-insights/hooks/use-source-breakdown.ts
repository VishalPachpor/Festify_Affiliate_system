"use client";

import { useQuery } from "@tanstack/react-query";
import { getSourceBreakdown } from "../api/get-attribution-breakdown";
import { attributionInsightsKeys } from "../query-keys";

export function useSourceBreakdown(tenantId: string | undefined) {
  return useQuery({
    queryKey: attributionInsightsKeys.sourceBreakdown(tenantId ?? ""),
    queryFn: () => getSourceBreakdown(tenantId!),
  });
}
