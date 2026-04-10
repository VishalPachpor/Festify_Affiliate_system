"use client";

import { useQuery } from "@tanstack/react-query";
import { getMilestoneTiers } from "../api/get-milestone-tiers";
import { milestoneKeys } from "@/services/queries/milestones";
import { useAffiliateContext } from "@/modules/affiliate-shell";

const CAMPAIGN_PLACEHOLDER = "default";

export function useMilestoneTiers(tenantId: string | undefined) {
  // Affiliate id comes from AffiliateProvider, which is mounted under
  // /dashboard/layout.tsx ONLY. On admin/organizer pages the context returns
  // null, so the backend falls back to tenant-wide milestone totals.
  const { affiliateId } = useAffiliateContext();

  return useQuery({
    queryKey: [...milestoneKeys.list(tenantId ?? "", CAMPAIGN_PLACEHOLDER), affiliateId ?? "tenant"],
    queryFn: () => getMilestoneTiers(),
    enabled: !!tenantId,
    refetchInterval: 3000, // demo: keep tier progress moving live
  });
}
