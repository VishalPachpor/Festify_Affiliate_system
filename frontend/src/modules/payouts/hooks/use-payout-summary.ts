"use client";

import { useQuery } from "@tanstack/react-query";
import { getPayoutSummary } from "../api/get-payout-summary";
import { payoutsKeys } from "../query-keys";

export function usePayoutSummary(tenantId: string | undefined) {
  return useQuery({
    queryKey: payoutsKeys.summary(tenantId ?? ""),
    queryFn: () => getPayoutSummary({ tenantId: tenantId! }),
  });
}
