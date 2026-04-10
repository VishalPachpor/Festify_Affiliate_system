import { apiClient } from "@/services/api/client";
import { attributionSummarySchema, type AttributionSummary } from "../types";

export async function getAttributionSummary(
  tenantId: string,
): Promise<AttributionSummary> {
  const raw = await apiClient<unknown>("/attribution/summary", {
    headers: { "x-tenant-id": tenantId },
  });
  return attributionSummarySchema.parse(raw);
}
