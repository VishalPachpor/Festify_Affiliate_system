import { apiClient } from "@/services/api/client";
import {
  topAffiliatesResponseSchema,
  type TopAffiliatesResponse,
} from "../types";

export async function getTopAffiliates(
  limit?: number,
): Promise<TopAffiliatesResponse> {
  const raw = await apiClient<unknown>("/dashboard/top-affiliates", {
    searchParams: { limit },
  });

  return topAffiliatesResponseSchema.parse(raw);
}
