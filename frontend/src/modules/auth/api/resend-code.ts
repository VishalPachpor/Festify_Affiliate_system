import { apiClient } from "@/services/api/client";

export async function resendCode(email: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>("/auth/resend-code", {
    method: "POST",
    body: { email },
  });
}
