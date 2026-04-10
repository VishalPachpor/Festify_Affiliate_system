"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth, destinationForRole } from "../provider";
import type { LoginFormValues } from "../schemas";

export function useLoginMutation() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  return useMutation({
    mutationFn: (data: LoginFormValues) => login(data),
    onSuccess: (user) => {
      // Honor ?next=… set by RouteGuard when an unauthenticated visit was
      // bounced here. Reject absolute / off-site URLs to avoid open-redirect.
      const nextRaw = searchParams?.get("next");
      const next =
        nextRaw && nextRaw.startsWith("/") && !nextRaw.startsWith("//")
          ? nextRaw
          : null;

      router.push(next ?? destinationForRole(user.role));
    },
  });
}
