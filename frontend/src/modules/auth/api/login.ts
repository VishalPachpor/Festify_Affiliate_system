import { apiClient } from "@/services/api/client";
import { sessionResponseSchema, type SessionResponse } from "../types";
import type { LoginFormValues } from "../schemas";

export async function login(data: LoginFormValues): Promise<SessionResponse> {
  const raw = await apiClient<unknown>("/auth/login", {
    method: "POST",
    body: { email: data.email, password: data.password },
  });
  return sessionResponseSchema.parse(raw);
}
