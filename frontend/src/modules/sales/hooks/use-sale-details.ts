"use client";

import { useQuery } from "@tanstack/react-query";
import { getSaleDetails } from "../api/get-sale-details";
import { salesKeys } from "../query-keys";

export function useSaleDetails(
  tenantId: string | undefined,
  saleId: string | undefined,
) {
  return useQuery({
    queryKey: salesKeys.detail(tenantId ?? "", saleId ?? ""),
    queryFn: () => getSaleDetails({ tenantId: tenantId!, saleId: saleId! }),
    enabled: !!tenantId && !!saleId,
  });
}
