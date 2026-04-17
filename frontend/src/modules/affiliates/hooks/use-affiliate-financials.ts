"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/api/client";
import { getAffiliateFinancials } from "../api/get-affiliate-financials";

export const affiliateFinancialsKeys = {
  detail: (affiliateId: string) => ["affiliate-financials", affiliateId] as const,
};

export function useAffiliateFinancials(affiliateId: string | null) {
  return useQuery({
    queryKey: affiliateFinancialsKeys.detail(affiliateId ?? ""),
    queryFn: () => getAffiliateFinancials(affiliateId!),
    enabled: !!affiliateId,
  });
}

// Pay all approved (unpaid earned) commissions for an affiliate.
// Backend: POST /api/payouts/create with no saleId pays every unpaid earned
// entry in a single atomic payout.
export function usePayAllApproved(affiliateId: string | null) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient<{ id: string; amountMinor: number }>("/payouts/create", {
        method: "POST",
        body: { affiliateId, markAsPaid: true },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["affiliate-financials"] });
      queryClient.invalidateQueries({ queryKey: ["affiliates"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["payouts"] });
    },
  });
}
