import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import {
  recentActivityResponseSchema,
  type RecentActivityResponse,
} from "../types";

export type GetRecentActivityParams = {
  tenantId: string;
};

export async function getRecentActivity(
  params: GetRecentActivityParams,
): Promise<RecentActivityResponse> {
  if (isMockEnabled()) {
    const { mockGetRecentActivity } = await import("@/mocks/handlers/dashboard");
    return mockGetRecentActivity();
  }

  const raw = await apiClient<unknown>("/dashboard/activity", {
    searchParams: {
      tenantId: params.tenantId,
    },
  });

  return recentActivityResponseSchema.parse(raw);
}
