"use client";

import { useQuery } from "@tanstack/react-query";
import { getMilestoneProgress } from "../api/get-milestone-progress";
import { milestoneKeys } from "@/services/queries/milestones";

// Milestone progress is tenant-scoped; campaignId not required at dashboard level.
const CAMPAIGN_PLACEHOLDER = "default";

export function useMilestoneProgress(tenantId: string | undefined) {
  return useQuery({
    queryKey: milestoneKeys.progress(
      tenantId ?? "",
      CAMPAIGN_PLACEHOLDER,
      "self",
    ),
    queryFn: () => getMilestoneProgress(tenantId!),
    enabled: !!tenantId,
  });
}
