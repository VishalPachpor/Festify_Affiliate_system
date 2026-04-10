"use client";

import { useQuery } from "@tanstack/react-query";
import { getMilestoneProgress } from "../api/get-milestone-progress";
import { milestoneKeys } from "@/services/queries/milestones";
import { useAffiliateContext } from "@/modules/affiliate-shell";

const CAMPAIGN_PLACEHOLDER = "default";

export function useMilestoneProgress(tenantId: string | undefined) {
  const { affiliateId } = useAffiliateContext();

  return useQuery({
    queryKey: [
      ...milestoneKeys.progress(tenantId ?? "", CAMPAIGN_PLACEHOLDER, "self"),
      affiliateId ?? "tenant",
    ],
    queryFn: () => getMilestoneProgress(),
    enabled: !!tenantId,
    refetchInterval: 3000,
  });
}
