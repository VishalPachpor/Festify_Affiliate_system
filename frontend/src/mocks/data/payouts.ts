import type { Payout, PayoutSummary } from "@/modules/payouts/types";

const payoutStatuses: Payout["status"][] = ["pending", "processing", "paid", "failed"];
const names = ["Sarah Chen", "Marcus Johnson", "Priya Patel", "James Kim", "Elena Rodriguez"];

export const mockPayouts: Payout[] = Array.from({ length: 32 }, (_, i) => {
  const status = payoutStatuses[i % 4];
  const amount = 500 + Math.floor(Math.random() * 4500);
  const processedAt = status === "paid" || status === "failed"
    ? new Date(Date.now() - i * 86_400_000).toISOString()
    : null;

  return {
    id: `payout-${i + 1}`,
    affiliateId: `aff-${(i % 5) + 1}`,
    affiliateName: names[i % 5],
    amount,
    currency: "USD",
    status,
    externalReference: status === "paid" ? `txn_${Math.random().toString(36).slice(2, 10)}` : null,
    createdAt: new Date(Date.now() - i * 86_400_000 - 172_800_000).toISOString(),
    processedAt,
  };
});

export const mockPayoutSummary: PayoutSummary = {
  totalPaid: 68400,
  totalPending: 12300,
  totalProcessing: 8700,
  totalFailed: 2100,
  currency: "USD",
  paidCount: 18,
  pendingCount: 8,
  processingCount: 4,
  failedCount: 2,
};
