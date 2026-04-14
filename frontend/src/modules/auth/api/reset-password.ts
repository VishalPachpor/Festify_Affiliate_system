import { apiClient } from "@/services/api/client";
import { sessionResponseSchema, type SessionResponse } from "../types";

export async function resetPassword(token: string, password: string): Promise<SessionResponse> {
  const raw = await apiClient<unknown>("/auth/reset-password", {
    method: "POST",
    body: { token, password },
  });
  return sessionResponseSchema.parse(raw);
}
