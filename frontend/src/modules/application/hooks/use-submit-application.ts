"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitApplication } from "../api/submit-application";
import { applicationKeys } from "./use-application-status";
import type { ApplicationSubmission } from "../types";

export function useSubmitApplication(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApplicationSubmission) =>
      submitApplication(tenantId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: applicationKeys.status(tenantId ?? ""),
      });
    },
  });
}
