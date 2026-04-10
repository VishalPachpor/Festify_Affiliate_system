import { apiClient } from "@/services/api/client";
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
  const raw = await apiClient<unknown>("/dashboard/activity", {
    headers: { "x-tenant-id": params.tenantId },
  });

  return recentActivityResponseSchema.parse(raw);
}
