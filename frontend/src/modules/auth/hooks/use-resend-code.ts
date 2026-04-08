"use client";

import { useMutation } from "@tanstack/react-query";
import { resendCode } from "../api/resend-code";

export function useResendCodeMutation() {
  return useMutation({
    mutationFn: (email: string) => resendCode(email),
  });
}
