"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "../api/get-dashboard-summary";
import { dashboardKeys } from "../query-keys";

export function useDashboardSummary(
  tenantId: string | undefined,
  campaignId?: string,
) {
  return useQuery({
    queryKey: dashboardKeys.summary(tenantId ?? "", campaignId),
    queryFn: () =>
      getDashboardSummary({
        tenantId: tenantId!,
        campaignId,
      }),
    enabled: !!tenantId,
  });
}
