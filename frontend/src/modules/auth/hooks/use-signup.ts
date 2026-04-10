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
    onSuccess: ({ email }) => {
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    },
  });
}
