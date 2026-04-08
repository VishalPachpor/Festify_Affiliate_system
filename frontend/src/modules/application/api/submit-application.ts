import { apiClient } from "@/services/api/client";
import { isMockEnabled } from "@/mocks/utils";
import type { ApplicationSubmission } from "../types";

export async function submitApplication(
  tenantId: string,
  data: ApplicationSubmission,
): Promise<{ success: boolean }> {
  if (isMockEnabled()) {
    const { mockSubmitApplication } = await import(
      "@/mocks/handlers/application"
    );
    return mockSubmitApplication();
  }

  return apiClient<{ success: boolean }>("/application/submit", {
    method: "POST",
    body: JSON.stringify({ tenantId, ...data }),
  });
}
