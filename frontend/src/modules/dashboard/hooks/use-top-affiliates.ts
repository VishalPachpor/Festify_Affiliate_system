"use client";

import { useQuery } from "@tanstack/react-query";
import { getTopAffiliates } from "../api/get-top-affiliates";
import { dashboardKeys } from "../query-keys";

export function useTopAffiliates(
  tenantId: string | undefined,
  limit: number = 5,
) {
  return useQuery({
    queryKey: dashboardKeys.topAffiliate(tenantId ?? "", limit),
    queryFn: () =>
      getTopAffiliates(limit),
    enabled: !!tenantId,
  });
}
