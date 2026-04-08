import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import { milestoneProgressSchema, type MilestoneProgress } from "../types";

export async function getMilestoneProgress(tenantId: string): Promise<MilestoneProgress> {
  if (isMockEnabled()) {
    const { mockGetMilestoneProgress } = await import("@/mocks/handlers/milestones");
    return mockGetMilestoneProgress();
  }

  const raw = await apiClient<unknown>("/milestones/progress", {
    searchParams: { tenantId },
  });
  return milestoneProgressSchema.parse(raw);
}
