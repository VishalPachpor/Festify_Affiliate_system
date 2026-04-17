"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth } from "../provider";
import type { SignUpFormValues } from "../schemas";

export function useSignupMutation() {
  const router = useRouter();
  const { signup } = useAuth();

  return useMutation({
    mutationFn: (data: SignUpFormValues) => signup(data),
    onSuccess: ({ email, devVerificationCode }) => {
      const params = new URLSearchParams({ email });
      // Dev-only: backend surfaced the code on the response because no email
      // provider is configured. Forward it so the verify page auto-fills.
      if (devVerificationCode) params.set("code", devVerificationCode);
      router.push(`/verify-email?${params.toString()}`);
    },
  });
}
