import { apiClient } from "@/services/api/client";
import { sessionResponseSchema, type SessionResponse } from "../types";

export async function loginWithGoogle(credential: string): Promise<SessionResponse> {
  const raw = await apiClient<unknown>("/auth/google", {
    method: "POST",
    body: { credential },
  });
  return sessionResponseSchema.parse(raw);
}
