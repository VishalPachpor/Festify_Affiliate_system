import { apiClient } from "@/services/api/client";
import {
  attributionTrendResponseSchema,
  type AttributionTrendResponse,
} from "../types";

export async function getAttributionTrends(
  tenantId: string,
): Promise<AttributionTrendResponse> {
  const raw = await apiClient<unknown>("/attribution/trends", {
    headers: { "x-tenant-id": tenantId },
  });
  return attributionTrendResponseSchema.parse(raw);
}
