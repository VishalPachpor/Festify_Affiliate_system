"use client";

import { useQuery } from "@tanstack/react-query";
import { getApplicationStatus } from "../api/get-application-status";
import { useAffiliateContext } from "@/modules/affiliate-shell";

export const applicationKeys = {
  status: (affiliateId: string | null) =>
    ["application-status", affiliateId ?? "anon"] as const,
};

export function useApplicationStatus(_tenantId: string | undefined) {
  const { affiliateId } = useAffiliateContext();

  return useQuery({
    queryKey: applicationKeys.status(affiliateId),
    queryFn: () => getApplicationStatus(),
  });
}
