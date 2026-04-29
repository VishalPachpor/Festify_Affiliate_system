import type { CommissionEntryType } from "@prisma/client";

// Ledger entry types that contribute to an affiliate's NET commission
// total. Every query that sums "what an affiliate is owed" (payout
// bundling, affiliate KPIs, sales-page commission column) must filter
// by this set:
//   • earned — positive entry from a successful sale
//   • tier_adjustment — positive retro delta when a sale crosses a tier
//   • reversal — NEGATIVE entry from a refund; subtracts via summation
// Filtering on "earned" alone silently drops both retro tier adjustments
// AND refund reversals.
export const COMMISSION_CREDIT_TYPES: CommissionEntryType[] = [
  "earned",
  "tier_adjustment",
  "reversal",
];
