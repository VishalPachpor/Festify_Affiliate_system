import { apiClient } from "@/services/api/client";

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>("/auth/forgot-password", {
    method: "POST",
    body: { email },
  });
}
