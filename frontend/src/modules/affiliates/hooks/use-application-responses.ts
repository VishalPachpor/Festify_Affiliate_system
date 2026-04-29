"use client";

import { useQuery } from "@tanstack/react-query";
import { getApplicationResponses } from "../api/get-application-responses";

export function useApplicationResponses(
  tenantId: string | undefined,
  idOrAffiliateId: string | null | undefined,
) {
  return useQuery({
    queryKey: ["affiliate-responses", tenantId ?? "", idOrAffiliateId ?? ""],
    queryFn: () =>
      getApplicationResponses({
        tenantId: tenantId!,
        idOrAffiliateId: idOrAffiliateId!,
      }),
    enabled: !!tenantId && !!idOrAffiliateId,
    staleTime: 30_000,
  });
}
