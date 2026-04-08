import { apiClient } from "@/services/api/client";
import {
  verifyEmailResponseSchema,
  type VerifyEmailResponse,
} from "../types";

export async function verifyEmail(code: string): Promise<VerifyEmailResponse> {
  const raw = await apiClient<unknown>("/auth/verify-email", {
    method: "POST",
    body: { code },
  });

  return verifyEmailResponseSchema.parse(raw);
}
