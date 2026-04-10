import { apiClient } from "@/services/api/client";
import {
  sourceBreakdownResponseSchema,
  failureReasonsResponseSchema,
  type SourceBreakdownResponse,
  type FailureReasonsResponse,
} from "../types";

export async function getSourceBreakdown(
  tenantId: string,
): Promise<SourceBreakdownResponse> {
  const raw = await apiClient<unknown>("/attribution/breakdown/source", {
    headers: { "x-tenant-id": tenantId },
  });
  return sourceBreakdownResponseSchema.parse(raw);
}

export async function getFailureReasons(
  tenantId: string,
): Promise<FailureReasonsResponse> {
  const raw = await apiClient<unknown>("/attribution/breakdown/failures", {
    headers: { "x-tenant-id": tenantId },
  });
  return failureReasonsResponseSchema.parse(raw);
}
