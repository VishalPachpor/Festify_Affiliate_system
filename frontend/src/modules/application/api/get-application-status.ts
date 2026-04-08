import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import {
  applicationStatusResponseSchema,
  type ApplicationStatusResponse,
} from "../types";

export async function getApplicationStatus(
  tenantId: string,
): Promise<ApplicationStatusResponse> {
  if (isMockEnabled()) {
    const { mockGetApplicationStatus } = await import(
      "@/mocks/handlers/application"
    );
    return mockGetApplicationStatus();
  }

  const raw = await apiClient<unknown>("/application/status", {
    searchParams: { tenantId },
  });
  return applicationStatusResponseSchema.parse(raw);
}
