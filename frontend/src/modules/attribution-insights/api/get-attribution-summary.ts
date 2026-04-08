import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import { attributionSummarySchema, type AttributionSummary } from "../types";

export async function getAttributionSummary(
  tenantId: string,
): Promise<AttributionSummary> {
  if (isMockEnabled()) {
    const { mockGetAttributionSummary } = await import("@/mocks/handlers/attribution");
    return mockGetAttributionSummary();
  }

  const raw = await apiClient<unknown>("/attribution/summary", {
    searchParams: { tenantId },
  });
  return attributionSummarySchema.parse(raw);
}
