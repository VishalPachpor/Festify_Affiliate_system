"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { signupOrganizer } from "../api/signup-organizer";
import type { OrganizerSignUpFormValues } from "../schemas";

export function useOrganizerSignupMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: OrganizerSignUpFormValues) => signupOrganizer(data),
    onSuccess: ({ email }) => {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    },
  });
}
