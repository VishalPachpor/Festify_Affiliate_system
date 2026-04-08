import { apiClient } from "@/services/api/client";
import { authResponseSchema, type AuthResponse } from "../types";
import type { LoginFormValues } from "../schemas";

export async function login(data: LoginFormValues): Promise<AuthResponse> {
  const raw = await apiClient<unknown>("/auth/login", {
    method: "POST",
    body: data,
  });

  return authResponseSchema.parse(raw);
}
