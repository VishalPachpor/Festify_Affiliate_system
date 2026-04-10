import { apiClient } from "@/services/api/client";
import {
  applicationStatusResponseSchema,
  type ApplicationStatusResponse,
} from "../types";

export async function getApplicationStatus(
  email?: string | null,
): Promise<ApplicationStatusResponse> {
  const query = email ? `?email=${encodeURIComponent(email)}` : "";
  const raw = await apiClient<unknown>(`/application/status${query}`);
  return applicationStatusResponseSchema.parse(raw);
}
