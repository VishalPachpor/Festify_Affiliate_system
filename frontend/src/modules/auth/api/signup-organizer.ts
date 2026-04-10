import { apiClient } from "@/services/api/client";
import { signupResponseSchema, type SignupResponse } from "../types";
import type { OrganizerSignUpFormValues } from "../schemas";

export async function signupOrganizer(
  data: OrganizerSignUpFormValues,
): Promise<SignupResponse> {
  const raw = await apiClient<unknown>("/auth/signup/organizer", {
    method: "POST",
    body: {
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      eventName: data.eventName,
    },
  });
  return signupResponseSchema.parse(raw);
}
