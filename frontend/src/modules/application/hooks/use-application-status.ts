"use client";

import { useQuery } from "@tanstack/react-query";
import { getApplicationStatus } from "../api/get-application-status";
import { useAffiliateContext } from "@/modules/affiliate-shell";
import { useAuth } from "@/modules/auth";

export const applicationKeys = {
  status: (affiliateId: string | null, email: string | null) =>
    ["application-status", affiliateId ?? "anon", email ?? "no-email"] as const,
};

export function useApplicationStatus(tenantId: string | undefined) {
  const { affiliateId } = useAffiliateContext();
  const { user } = useAuth();
  const email = user?.email ?? null;

  return useQuery({
    queryKey: applicationKeys.status(affiliateId, email),
    queryFn: () => getApplicationStatus(email),
    enabled: !!tenantId,
  });
}
