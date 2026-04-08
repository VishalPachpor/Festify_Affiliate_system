"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { verifyEmail } from "../api/verify-email";

export function useVerifyEmailMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (code: string) => verifyEmail(code),
    onSuccess: () => {
      router.push("/dashboard");
    },
  });
}
