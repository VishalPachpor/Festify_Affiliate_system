"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { login } from "../api/login";
import type { LoginFormValues } from "../schemas";

export function useLoginMutation() {
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginFormValues) => login(data),
    onSuccess: () => {
      router.push("/dashboard");
    },
  });
}
