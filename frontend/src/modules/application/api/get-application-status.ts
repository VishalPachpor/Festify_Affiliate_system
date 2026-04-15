import { apiClient } from "@/services/api/client";
import {
  applicationStatusResponseSchema,
  type ApplicationStatusResponse,
} from "../types";

export async function getApplicationStatus(): Promise<ApplicationStatusResponse> {
  const raw = await apiClient<unknown>("/application/status");
  return applicationStatusResponseSchema.parse(raw);
}
