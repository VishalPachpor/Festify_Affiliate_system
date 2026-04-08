"use client";

import { useQuery } from "@tanstack/react-query";
import { getMilestoneTiers } from "../api/get-milestone-tiers";
import { milestoneKeys } from "@/services/queries/milestones";

const CAMPAIGN_PLACEHOLDER = "default";

export function useMilestoneTiers(tenantId: string | undefined) {
  return useQuery({
    queryKey: milestoneKeys.list(tenantId ?? "", CAMPAIGN_PLACEHOLDER),
    queryFn: () => getMilestoneTiers(tenantId!),
    enabled: !!tenantId,
  });
}
