import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import { milestoneTiersResponseSchema, type MilestoneTiersResponse } from "../types";

export async function getMilestoneTiers(tenantId: string): Promise<MilestoneTiersResponse> {
  if (isMockEnabled()) {
    const { mockGetMilestoneTiers } = await import("@/mocks/handlers/milestones");
    return mockGetMilestoneTiers();
  }

  const raw = await apiClient<unknown>("/milestones/tiers", {
    searchParams: { tenantId },
  });
  return milestoneTiersResponseSchema.parse(raw);
}
