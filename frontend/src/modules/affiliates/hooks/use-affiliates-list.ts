"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { getAffiliatesList } from "../api/get-affiliates-list";
import { affiliatesKeys } from "../query-keys";
import type { AffiliatesFilterState } from "../types";

export function useAffiliatesList(
  tenantId: string | undefined,
  filters: AffiliatesFilterState,
  campaignId?: string,
) {
  return useQuery({
    queryKey: affiliatesKeys.list(tenantId ?? "", campaignId, filters),
    queryFn: () =>
      getAffiliatesList({ tenantId: tenantId!, campaignId, filters }),
    enabled: !!tenantId,
    placeholderData: keepPreviousData,
  });
}
