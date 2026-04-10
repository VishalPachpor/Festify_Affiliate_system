import { apiClient } from "@/services/api/client";
import type { ApplicationSubmission } from "../types";

export async function submitApplication(
  tenantId: string,
  data: ApplicationSubmission,
): Promise<{ success: boolean; duplicate?: boolean; id?: string }> {
  return apiClient<{ success: boolean; duplicate?: boolean; id?: string }>(
    "/application/submit",
    {
      method: "POST",
      headers: { "x-tenant-id": tenantId },
      body: data, // apiClient JSON.stringifies for us — do NOT pre-encode
    },
  );
}
