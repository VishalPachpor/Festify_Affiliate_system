"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { signup } from "../api/signup";
import type { SignUpFormValues } from "../schemas";

export function useSignupMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: SignUpFormValues) => signup(data),
    onSuccess: (_response, variables) => {
      router.push(
        `/verify-email?email=${encodeURIComponent(variables.email)}`,
      );
    },
  });
}
