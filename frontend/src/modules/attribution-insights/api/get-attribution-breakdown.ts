import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import {
  sourceBreakdownResponseSchema,
  failureReasonsResponseSchema,
  type SourceBreakdownResponse,
  type FailureReasonsResponse,
} from "../types";

export async function getSourceBreakdown(
  tenantId: string,
): Promise<SourceBreakdownResponse> {
  if (isMockEnabled()) {
    const { mockGetSourceBreakdown } = await import("@/mocks/handlers/attribution");
    return mockGetSourceBreakdown();
  }

  const raw = await apiClient<unknown>("/attribution/breakdown/source", {
    searchParams: { tenantId },
  });
  return sourceBreakdownResponseSchema.parse(raw);
}

export async function getFailureReasons(
  tenantId: string,
): Promise<FailureReasonsResponse> {
  if (isMockEnabled()) {
    const { mockGetFailureReasons } = await import("@/mocks/handlers/attribution");
    return mockGetFailureReasons();
  }

  const raw = await apiClient<unknown>("/attribution/breakdown/failures", {
    searchParams: { tenantId },
  });
  return failureReasonsResponseSchema.parse(raw);
}
