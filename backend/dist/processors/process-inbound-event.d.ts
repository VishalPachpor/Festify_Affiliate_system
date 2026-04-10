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
//# sourceMappingURL=process-inbound-event.d.ts.map