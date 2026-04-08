import { apiClient } from "@/services/api/client";
import { authResponseSchema, type AuthResponse } from "../types";
import type { SignUpFormValues } from "../schemas";

export async function signup(data: SignUpFormValues): Promise<AuthResponse> {
  const raw = await apiClient<unknown>("/auth/signup", {
    method: "POST",
    body: {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
    },
  });

  return authResponseSchema.parse(raw);
}
