"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getSalesList } from "../api/get-sales-list";
import { salesKeys } from "../query-keys";
import type { SalesFilterState } from "../types";

export function useSalesList(
  tenantId: string | undefined,
  filters: SalesFilterState,
  campaignId?: string,
) {
  return useQuery({
    queryKey: salesKeys.list(tenantId ?? "", campaignId, filters),
    queryFn: () =>
      getSalesList({ tenantId: tenantId!, campaignId, filters }),
    placeholderData: keepPreviousData,
  });
}
