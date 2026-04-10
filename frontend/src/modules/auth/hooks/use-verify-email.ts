"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useAuth, destinationForRole } from "../provider";

export function useVerifyEmailMutation() {
  const router = useRouter();
  const { verifyEmail } = useAuth();

  return useMutation({
    mutationFn: ({ email, code }: { email: string; code: string }) =>
      verifyEmail(email, code),
    onSuccess: (user) => {
      router.push(destinationForRole(user.role));
    },
  });
}
