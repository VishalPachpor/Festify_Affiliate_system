import type { Milestone } from "@prisma/client";
/**
 * Thrown when an event can't be processed yet but should be retried later.
 * Causes status to remain "pending" instead of moving to "failed".
 */
export declare class RetryableError extends Error {
    constructor(message: string);
}
/**
 * Process a single pending InboundEvent by its ID.
 * Called by a worker loop or directly after ingestion.
 *
 * Status transitions are OUTSIDE the business transaction:
 *   success → "processed" + processedAt
 *   failure → "failed" + lastError
 * This guarantees the event always leaves "pending" state.
 */
export declare function processInboundEvent(eventId: string): Promise<void>;
/**
 * Pick the rate that applies at a given cumulative attributed revenue.
 *
 * Walks tiers in ascending targetMinor order and returns the highest tier
 * whose threshold has been crossed. Falls back to the campaign rate if
 * no tiers are defined for the tenant or the affiliate hasn't crossed
 * even the entry tier's threshold (defensive — entry tier should be 0).
 *
 * Exported for unit testing. Accepts a loose tier shape so the test can
 * construct fixtures without pulling the full Prisma `Milestone` type.
 */
export declare function pickTierRateBps(tiers: Pick<Milestone, "targetMinor" | "commissionRateBps">[], cumulativeRevenueMinor: number, campaignRateBps: number): number;
/**
 * Canonicalise a referral code for affiliate lookups.
 *
 * Admin approval forces codes to UPPER + alphanumeric-only on the way in
 * (see frontend/src/app/admin/affiliates/page.tsx), so CampaignAffiliate
 * rows are always stored in that shape. Webhooks echo whatever the buyer
 * typed at checkout (Luma is case-insensitive on coupons), so lookups must
 * normalize identically — otherwise a `vishal2020` sale misses
 * `VISHAL2020` and attribution silently fails.
 */
export declare function normalizeReferralCode(raw: string | null | undefined): string | null;
//# sourceMappingURL=process-inbound-event.d.ts.map