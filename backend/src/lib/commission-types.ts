import type { CommissionEntryType } from "@prisma/client";

// Ledger entry types that add to an affiliate's earned commission total.
// Every query that sums "what an affiliate earned" (payout bundling,
// affiliate KPIs, sales-page commission column) must filter by this set —
// filtering on "earned" alone silently drops retroactive tier adjustments.
export const COMMISSION_CREDIT_TYPES: CommissionEntryType[] = ["earned", "tier_adjustment"];
