"use client";

import { useQuery } from "@tanstack/react-query";
import { getRecentActivity } from "../api/get-recent-activity";
import { dashboardKeys } from "../query-keys";

export function useRecentActivity(tenantId: string | undefined) {
  return useQuery({
    queryKey: dashboardKeys.activity(tenantId ?? ""),
    queryFn: () =>
      getRecentActivity({ tenantId: tenantId! }),
  });
}
