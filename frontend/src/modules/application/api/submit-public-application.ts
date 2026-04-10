import { apiClient } from "@/services/api/client";

export type PublicApplicationPayload = {
  eventSlug: string;
  firstName: string;
  email: string;
  socialProfiles?: string;
  audienceSize?: string;
  experience?: string;
  fitReason: string;
};

export type PublicApplicationResponse = {
  id: string;
  status: "pending" | "approved" | "rejected";
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
