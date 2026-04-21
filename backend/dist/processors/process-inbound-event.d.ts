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