"use client";

import { useQuery } from "@tanstack/react-query";
import { getFailureReasons } from "../api/get-attribution-breakdown";
import { attributionInsightsKeys } from "../query-keys";

export function useFailureReasons(tenantId: string | undefined) {
  return useQuery({
    queryKey: attributionInsightsKeys.failureReasons(tenantId ?? ""),
    queryFn: () => getFailureReasons(tenantId!),
    enabled: !!tenantId,
  });
}
