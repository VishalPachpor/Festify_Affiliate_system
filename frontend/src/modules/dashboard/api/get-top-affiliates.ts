import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import {
  topAffiliatesResponseSchema,
  type TopAffiliatesResponse,
} from "../types";

export type GetTopAffiliatesParams = {
  tenantId: string;
  limit?: number;
};

export async function getTopAffiliates(
  params: GetTopAffiliatesParams,
): Promise<TopAffiliatesResponse> {
  if (isMockEnabled()) {
    const { mockGetTopAffiliates } = await import("@/mocks/handlers/dashboard");
    return mockGetTopAffiliates();
  }

  const raw = await apiClient<unknown>("/dashboard/top-affiliates", {
    searchParams: {
      tenantId: params.tenantId,
      limit: params.limit,
    },
  });

  return topAffiliatesResponseSchema.parse(raw);
}
