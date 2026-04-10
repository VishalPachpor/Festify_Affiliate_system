import type { ProviderAdapter, NormalizedEvent } from "../core/adapter";

// ─────────────────────────────────────────────────────────────────────────────
// Generic Adapter
//
// Accepts a simple, standardized webhook format for any provider.
// Used for testing and providers without a dedicated adapter.
//
// Expected payload:
// {
//   id: "evt_123",
//   orderId: "order_456",
//   amountMinor: 10000,        // OR amount: 100.00
//   currency: "USD",
//   referralCode: "REF-ALEX",  // optional
//   campaignId: "camp_1",      // optional
// }
// ─────────────────────────────────────────────────────────────────────────────

export const genericAdapter: ProviderAdapter = {
  name: "generic",

  verifySignature(): boolean {
    // Generic adapter has no signature verification.
    // Block in production — only allow known, signed providers.
    if (process.env.NODE_ENV?.toLowerCase() === "production") {
      console.error("[generic-adapter] Generic webhooks are disabled in production");
      return false;
    }
    return true;
  },

  extractEventId(body): string {
    const data = body as Record<string, unknown>;
    return String(data.id ?? "");
  },

  normalize(body): NormalizedEvent {
    const data = body as Record<string, unknown>;

    const eventId = String(data.id ?? "");
    if (!eventId) throw new Error("Generic payload missing 'id'");

    const orderId = String(data.orderId ?? data.order_id ?? "");
    if (!orderId) throw new Error("Generic payload missing 'orderId'");

    // Accept amountMinor (cents) directly, or convert amount (dollars)
    let amountMinor: number;
    if (typeof data.amountMinor === "number") {
      amountMinor = data.amountMinor;
    } else if (typeof data.amount === "number") {
      amountMinor = Math.round(data.amount * 100);
    } else {
      throw new Error("Generic payload missing 'amountMinor' or 'amount'");
    }

    return {
      externalEventId: eventId,
      externalOrderId: orderId,
      type: "ticket.purchased",
      amountMinor,
      currency: String(data.currency ?? "USD").toUpperCase(),
      referralCode: (data.referralCode as string) ?? (data.referral_code as string) ?? null,
      buyerEmail: (data.email as string) ?? null,
      campaignId: (data.campaignId as string) ?? (data.campaign_id as string) ?? null,
      occurredAt: (data.occurredAt as string) ?? new Date().toISOString(),
      rawPayload: body,
    };
  },
};
