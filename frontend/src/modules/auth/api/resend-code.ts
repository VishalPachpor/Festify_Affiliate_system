import { apiClient } from "@/services/api/client";
import { resendCodeResponseSchema, type ResendCodeResponse } from "../types";

export async function resendCode(email: string): Promise<ResendCodeResponse> {
  const raw = await apiClient<unknown>("/auth/resend-code", {
    method: "POST",
    body: { email },
  });
  return resendCodeResponseSchema.parse(raw);
}
