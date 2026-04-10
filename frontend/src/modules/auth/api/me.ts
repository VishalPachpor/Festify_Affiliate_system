import { apiClient } from "@/services/api/client";
import { meResponseSchema, type MeResponse } from "../types";

export async function getMe(): Promise<MeResponse> {
  const raw = await apiClient<unknown>("/auth/me");
  return meResponseSchema.parse(raw);
}
