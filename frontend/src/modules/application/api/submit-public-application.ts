import { apiClient } from "@/services/api/client";
import type { ApplicationSubmission } from "../types";

export type PublicApplicationPayload = ApplicationSubmission & {
  eventSlug: string;
};

export type PublicApplicationResponse = {
  id: string;
  status: "pending" | "approved_pending_mou" | "approved" | "rejected";
  duplicate: boolean;
};

export async function submitPublicApplication(
  data: PublicApplicationPayload,
): Promise<PublicApplicationResponse> {
  return apiClient<PublicApplicationResponse>("/public/applications", {
    method: "POST",
    body: data,
  });
}
