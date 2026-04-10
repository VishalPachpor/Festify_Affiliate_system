import { apiClient } from "@/services/api/client";
import { milestoneTiersResponseSchema, type MilestoneTiersResponse } from "../types";

export async function getMilestoneTiers(): Promise<MilestoneTiersResponse> {
  const raw = await apiClient<unknown>("/milestones/tiers");
  return milestoneTiersResponseSchema.parse(raw);
}
