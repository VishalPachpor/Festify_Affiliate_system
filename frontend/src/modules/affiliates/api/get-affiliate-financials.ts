import { apiClient } from "@/services/api/client";
import { z } from "zod";

const payoutLogSchema = z.object({
  id: z.string(),
  amountMinor: z.number(),
  currency: z.string(),
  status: z.enum(["pending", "processing", "paid", "failed"]),
  createdAt: z.string(),
  processedAt: z.string().nullable(),
});

export const affiliateFinancialsSchema = z.object({
  affiliateId: z.string(),
  currency: z.string(),
  totalEarnedMinor: z.number(),
  pendingMinor: z.number(),
  paidMinor: z.number(),
  payouts: z.array(payoutLogSchema),
});

export type AffiliateFinancials = z.infer<typeof affiliateFinancialsSchema>;
export type AffiliatePayoutLog = z.infer<typeof payoutLogSchema>;

export async function getAffiliateFinancials(
  affiliateId: string,
): Promise<AffiliateFinancials> {
  const raw = await apiClient<unknown>(`/affiliates/${affiliateId}/financials`);
  return affiliateFinancialsSchema.parse(raw);
}
