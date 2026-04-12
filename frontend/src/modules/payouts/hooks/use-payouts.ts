"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getPayouts } from "../api/get-payouts";
import { payoutsKeys } from "../query-keys";
import type { PayoutsFilterState } from "../types";

export function usePayouts(
  tenantId: string | undefined,
  filters: PayoutsFilterState,
) {
  return useQuery({
    queryKey: payoutsKeys.list(tenantId ?? "", filters),
    queryFn: () => getPayouts({ tenantId: tenantId!, filters }),
    placeholderData: keepPreviousData,
  });
}
