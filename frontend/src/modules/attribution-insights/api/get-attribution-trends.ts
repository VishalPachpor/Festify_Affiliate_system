import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import {
  attributionTrendResponseSchema,
  type AttributionTrendResponse,
} from "../types";

export async function getAttributionTrends(
  tenantId: string,
): Promise<AttributionTrendResponse> {
  if (isMockEnabled()) {
    const { mockGetAttributionTrends } = await import("@/mocks/handlers/attribution");
    return mockGetAttributionTrends();
  }

  const raw = await apiClient<unknown>("/attribution/trends", {
    searchParams: { tenantId },
  });
  return attributionTrendResponseSchema.parse(raw);
}
