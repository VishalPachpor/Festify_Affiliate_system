"use client";

import { useQuery } from "@tanstack/react-query";
import { getApplicationStatus } from "../api/get-application-status";

export const applicationKeys = {
  status: (tenantId: string) => ["application-status", tenantId] as const,
};

export function useApplicationStatus(tenantId: string | undefined) {
  return useQuery({
    queryKey: applicationKeys.status(tenantId ?? ""),
    queryFn: () => getApplicationStatus(tenantId!),
    enabled: !!tenantId,
  });
}
