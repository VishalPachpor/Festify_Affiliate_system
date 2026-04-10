"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { submitApplication } from "../api/submit-application";
import type { ApplicationSubmission } from "../types";

export function useSubmitApplication(tenantId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ApplicationSubmission) =>
      submitApplication(tenantId!, data),
    onSuccess: () => {
      queryClient.setQueriesData(
        { queryKey: ["application-status"] },
        () => ({ status: "pending" }),
      );
      // Invalidate by prefix — the new key shape includes affiliateId and we
      // don't care which variant updates. TanStack invalidates by partial match.
      queryClient.invalidateQueries({ queryKey: ["application-status"] });
    },
  });
}
