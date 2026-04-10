// ─────────────────────────────────────────────────────────────────────────────
// Provider Adapter Interface
//
// Every ticketing provider implements this interface. The webhook ingestion
// endpoint uses it to normalize external payloads into our internal format
// before storing as InboundEvent.
//
// Adapters NEVER touch business logic — they only parse and normalize.
// ─────────────────────────────────────────────────────────────────────────────

export type NormalizedEvent = {
  externalEventId: string;
  externalOrderId: string;
  type: "ticket.purchased" | "ticket.refunded";
  amountMinor: number;
  currency: string;
  referralCode: string | null;
  buyerEmail: string | null;
  campaignId: string | null;
  occurredAt: string;
  rawPayload: unknown;
};

export interface ProviderAdapter {
  /** Provider name (lowercase). Used in replayKey and routing. */
  name: string;

  /**
   * Verify the webhook signature/secret.
   * Returns true if valid, false if rejected.
   * If provider doesn't support signatures, return true.
   *
   * @param rawBody - The original request body as a Buffer, used for HMAC
   *   verification. Adapters MUST hash this (not a re-serialized object) to
   *   match the signature the provider computed over the wire bytes.
   */
  verifySignature(headers: Record<string, string | string[] | undefined>, body: unknown, rawBody: Buffer): boolean;

  /**
   * Extract the external event ID for idempotency.
   * Must be deterministic for the same event.
   */
  extractEventId(body: unknown): string;

  /**
   * Normalize the provider-specific payload into our internal format.
   * Throws if the payload is malformed.
   */
  normalize(body: unknown): NormalizedEvent;
}
