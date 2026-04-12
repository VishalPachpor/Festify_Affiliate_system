"use client";

import { useQuery } from "@tanstack/react-query";
import { getDashboardTrend } from "../api/get-dashboard-trend";
import { dashboardKeys } from "../query-keys";

export function useDashboardTrend(
  tenantId: string | undefined,
  campaignId?: string,
) {
  return useQuery({
    queryKey: dashboardKeys.trend(tenantId ?? "", campaignId),
    queryFn: () =>
      getDashboardTrend({ tenantId: tenantId!, campaignId }),
  });
}
