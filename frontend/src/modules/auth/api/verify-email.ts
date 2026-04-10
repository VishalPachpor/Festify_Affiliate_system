import { apiClient } from "@/services/api/client";
import { sessionResponseSchema, type SessionResponse } from "../types";

export async function verifyEmail(email: string, code: string): Promise<SessionResponse> {
  const raw = await apiClient<unknown>("/auth/verify-email", {
    method: "POST",
    body: { email, code },
  });
  return sessionResponseSchema.parse(raw);
}
