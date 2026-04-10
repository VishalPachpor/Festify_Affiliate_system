import { apiClient } from "@/services/api/client";
import { signupResponseSchema, type SignupResponse } from "../types";
import type { SignUpFormValues } from "../schemas";

export async function signup(data: SignUpFormValues): Promise<SignupResponse> {
  const raw = await apiClient<unknown>("/auth/signup", {
    method: "POST",
    body: {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
    },
  });
  return signupResponseSchema.parse(raw);
}
