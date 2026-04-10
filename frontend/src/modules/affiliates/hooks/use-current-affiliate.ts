"use client";

import { useQuery } from "@tanstack/react-query";
import { useAffiliateContext } from "@/modules/affiliate-shell";
import { useAuth } from "@/modules/auth";
import { getCurrentAffiliate, type CurrentAffiliate } from "../api/get-current-affiliate";

/**
 * Resolves the "current affiliate" for the affiliate-side dashboard.
 *
 * The backend reads affiliateId from the JWT — no header needed.
 * Query stays disabled when affiliateId is null (admin pages).
 */
export function useCurrentAffiliate() {
  const { affiliateId } = useAffiliateContext();
  const { user } = useAuth();
  const canResolveAffiliate = user?.role === "affiliate" && !!user?.tenantId;

  return useQuery<CurrentAffiliate>({
    queryKey: ["affiliate", "me", affiliateId ?? "pending-link", user?.id ?? "anon"],
    queryFn: () => getCurrentAffiliate(),
    enabled: canResolveAffiliate,
    refetchInterval: 3000,
  });
}
