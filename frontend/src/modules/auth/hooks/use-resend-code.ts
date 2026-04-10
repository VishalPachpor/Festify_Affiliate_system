"use client";

import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../provider";

export function useResendCodeMutation() {
  const { resendCode } = useAuth();
  return useMutation({
    mutationFn: (email: string) => resendCode(email),
  });
}
